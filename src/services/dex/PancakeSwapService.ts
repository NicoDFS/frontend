// PancakeSwap DEX service implementation
// Handles all PancakeSwap-specific operations on BSC

import { BaseDexService } from './BaseDexService';
import { SwapParams, Token } from '@/config/dex/types';
import { PANCAKESWAP_CONFIG } from '@/config/dex/pancakeswap';
import { DexError, SwapFailedError } from './IDexService';
import { getContract, parseUnits, createPublicClient, http } from 'viem';
import type { WalletClient, PublicClient } from 'viem';
import { bsc } from 'viem/chains';
import { chainRpcUrls } from '@/config/wagmi.config';

export class PancakeSwapService extends BaseDexService {
  constructor() {
    super(PANCAKESWAP_CONFIG);
  }

  getName(): string {
    return 'PancakeSwap';
  }

  getChainId(): number {
    return 56; // BSC
  }

  async executeSwap(params: SwapParams, walletClient: WalletClient): Promise<string> {
    try {
      if (!walletClient) {
        throw new DexError('Wallet client not available', 'NO_WALLET', this.getName());
      }

      // Get swap route
      const route = params.route || await this.getSwapRoute(params.tokenIn, params.tokenOut, walletClient as any);
      if (route.length === 0) {
        throw new SwapFailedError(this.getName(), 'No swap route available');
      }

      // Convert amounts to proper units
      const amountIn = parseUnits(params.amountIn, params.tokenIn.decimals);
      const amountOutMin = parseUnits(params.amountOutMin, params.tokenOut.decimals);

      // Calculate deadline (current time + deadline minutes)
      const deadline = Math.floor(Date.now() / 1000) + (params.deadline * 60);

      // Get account from wallet client
      const account = walletClient.account;
      if (!account) {
        throw new DexError('No account found in wallet client', 'NO_ACCOUNT', this.getName());
      }

      let txHash: string;

      // Handle different swap scenarios
      if (params.tokenIn.isNative) {
        // BNB to Token
        txHash = await walletClient.writeContract({
          address: this.config.router as `0x${string}`,
          abi: this.config.routerABI,
          functionName: 'swapExactETHForTokens',
          args: [
            amountOutMin,
            route,
            params.to as `0x${string}`,
            BigInt(deadline)
          ],
          value: amountIn,
          account,
          chain: undefined
        });
      } else if (params.tokenOut.isNative) {
        // Token to BNB
        txHash = await walletClient.writeContract({
          address: this.config.router as `0x${string}`,
          abi: this.config.routerABI,
          functionName: 'swapExactTokensForETH',
          args: [
            amountIn,
            amountOutMin,
            route,
            params.to as `0x${string}`,
            BigInt(deadline)
          ],
          account,
          chain: undefined
        });
      } else {
        // Token to Token
        txHash = await walletClient.writeContract({
          address: this.config.router as `0x${string}`,
          abi: this.config.routerABI,
          functionName: 'swapExactTokensForTokens',
          args: [
            amountIn,
            amountOutMin,
            route,
            params.to as `0x${string}`,
            BigInt(deadline)
          ],
          account,
          chain: undefined
        });
      }

      return txHash;
    } catch (error) {
      console.error('PancakeSwap executeSwap error:', error);
      if (error instanceof DexError) {
        throw error;
      }
      throw new SwapFailedError(this.getName(), error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // PancakeSwap-specific helper methods
  async getBNBPrice(): Promise<number> {
    try {
      // Get BNB/USDT pair price
      const bnbToken = this.config.tokens.find(t => t.isNative);
      const usdtToken = this.config.tokens.find(t => t.symbol === 'USDT');

      if (!bnbToken || !usdtToken) {
        return 0;
      }

      // Create a public client for reading data
      const publicClient = createPublicClient({
        chain: bsc,
        transport: http(chainRpcUrls[this.getChainId() as keyof typeof chainRpcUrls])
      });

      const pairInfo = await this.getPairInfo(bnbToken, usdtToken, publicClient);
      if (!pairInfo) {
        return 0;
      }

      // Calculate price from reserves
      const bnbReserve = parseFloat(pairInfo.reserve0);
      const usdtReserve = parseFloat(pairInfo.reserve1);

      return usdtReserve / bnbReserve;
    } catch (error) {
      console.error('Error getting BNB price:', error);
      return 0;
    }
  }

  async getCAKEPrice(): Promise<number> {
    try {
      // Get CAKE/BNB pair price, then convert to USD
      const cakeToken = this.config.tokens.find(t => t.symbol === 'CAKE');
      const bnbToken = this.config.tokens.find(t => t.isNative);

      if (!cakeToken || !bnbToken) {
        return 0;
      }

      // Create a public client for reading data
      const publicClient = createPublicClient({
        chain: bsc,
        transport: http(chainRpcUrls[this.getChainId() as keyof typeof chainRpcUrls])
      });

      const pairInfo = await this.getPairInfo(cakeToken, bnbToken, publicClient);
      if (!pairInfo) {
        return 0;
      }

      // Calculate CAKE price in BNB
      const cakeReserve = parseFloat(pairInfo.reserve0);
      const bnbReserve = parseFloat(pairInfo.reserve1);
      const cakePriceInBNB = bnbReserve / cakeReserve;

      // Get BNB price in USD
      const bnbPriceUSD = await this.getBNBPrice();

      return cakePriceInBNB * bnbPriceUSD;
    } catch (error) {
      console.error('Error getting CAKE price:', error);
      return 0;
    }
  }

  // Override route calculation for PancakeSwap-specific routing
  async getSwapRoute(tokenIn: Token, tokenOut: Token, publicClient: PublicClient): Promise<string[]> {
    const addressIn = tokenIn.isNative ? this.getWethAddress() : tokenIn.address;
    const addressOut = tokenOut.isNative ? this.getWethAddress() : tokenOut.address;

    // Check direct pair first
    const directPairExists = await this.canSwapDirectly(tokenIn, tokenOut, publicClient);
    if (directPairExists) {
      return [addressIn, addressOut];
    }

    // Try routing through WBNB
    const wbnbAddress = this.getWethAddress();
    if (addressIn !== wbnbAddress && addressOut !== wbnbAddress) {
      const wbnbToken = this.config.tokens.find(t => t.address.toLowerCase() === wbnbAddress.toLowerCase());
      if (wbnbToken) {
        const canRouteViaWBNB = await Promise.all([
          this.canSwapDirectly(tokenIn, wbnbToken, publicClient),
          this.canSwapDirectly(wbnbToken, tokenOut, publicClient)
        ]);

        if (canRouteViaWBNB[0] && canRouteViaWBNB[1]) {
          return [addressIn, wbnbAddress, addressOut];
        }
      }
    }

    // Try routing through USDT (major stablecoin on BSC)
    const usdtToken = this.config.tokens.find(t => t.symbol === 'USDT');
    if (usdtToken && addressIn !== usdtToken.address && addressOut !== usdtToken.address) {
      const canRouteViaUSDT = await Promise.all([
        this.canSwapDirectly(tokenIn, usdtToken, publicClient),
        this.canSwapDirectly(usdtToken, tokenOut, publicClient)
      ]);

      if (canRouteViaUSDT[0] && canRouteViaUSDT[1]) {
        return [addressIn, usdtToken.address, addressOut];
      }
    }

    // Try routing through BUSD (BSC-specific stablecoin)
    const busdToken = this.config.tokens.find(t => t.symbol === 'BUSD');
    if (busdToken && addressIn !== busdToken.address && addressOut !== busdToken.address) {
      const canRouteViaBUSD = await Promise.all([
        this.canSwapDirectly(tokenIn, busdToken, publicClient),
        this.canSwapDirectly(busdToken, tokenOut, publicClient)
      ]);

      if (canRouteViaBUSD[0] && canRouteViaBUSD[1]) {
        return [addressIn, busdToken.address, addressOut];
      }
    }

    // No route found
    return [];
  }
}
