// PancakeSwap DEX service implementation
// Handles all PancakeSwap-specific operations on BSC

import { BaseDexService } from './BaseDexService';
import { SwapParams, Token } from '@/config/dex/types';
import { PANCAKESWAP_CONFIG } from '@/config/dex/pancakeswap';
import { DexError, SwapFailedError } from './IDexService';
import { useWalletClient } from 'wagmi';
import { getContract, parseUnits } from 'viem';

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

  async executeSwap(params: SwapParams): Promise<string> {
    try {
      const walletClient = useWalletClient();
      if (!walletClient.data) {
        throw new DexError('Wallet client not available', 'NO_WALLET', this.getName());
      }

      // Get swap route
      const route = await this.getSwapRoute(params.tokenIn, params.tokenOut);
      if (route.length === 0) {
        throw new SwapFailedError(this.getName(), 'No swap route available');
      }

      // Convert amounts to proper units
      const amountIn = parseUnits(params.amountIn, params.tokenIn.decimals);
      const amountOutMin = parseUnits(params.amountOutMin, params.tokenOut.decimals);

      // Get router contract
      const routerContract = getContract({
        address: this.config.router as `0x${string}`,
        abi: this.config.routerABI,
        client: walletClient.data,
      });

      // Calculate deadline (current time + deadline minutes)
      const deadline = Math.floor(Date.now() / 1000) + (params.deadline * 60);

      let txHash: string;

      // Handle different swap scenarios
      if (params.tokenIn.isNative) {
        // BNB to Token
        txHash = await routerContract.write.swapExactETHForTokens([
          amountOutMin,
          route,
          params.to as `0x${string}`,
          BigInt(deadline)
        ], {
          value: amountIn
        }) as string;
      } else if (params.tokenOut.isNative) {
        // Token to BNB
        txHash = await routerContract.write.swapExactTokensForETH([
          amountIn,
          amountOutMin,
          route,
          params.to as `0x${string}`,
          BigInt(deadline)
        ]) as string;
      } else {
        // Token to Token
        txHash = await routerContract.write.swapExactTokensForTokens([
          amountIn,
          amountOutMin,
          route,
          params.to as `0x${string}`,
          BigInt(deadline)
        ]) as string;
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

      const pairInfo = await this.getPairInfo(bnbToken, usdtToken);
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

      const pairInfo = await this.getPairInfo(cakeToken, bnbToken);
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
  async getSwapRoute(tokenIn: Token, tokenOut: Token): Promise<string[]> {
    const addressIn = tokenIn.isNative ? this.getWethAddress() : tokenIn.address;
    const addressOut = tokenOut.isNative ? this.getWethAddress() : tokenOut.address;

    // Check direct pair first
    const directPairExists = await this.canSwapDirectly(tokenIn, tokenOut);
    if (directPairExists) {
      return [addressIn, addressOut];
    }

    // Try routing through WBNB
    const wbnbAddress = this.getWethAddress();
    if (addressIn !== wbnbAddress && addressOut !== wbnbAddress) {
      const wbnbToken = this.config.tokens.find(t => t.address.toLowerCase() === wbnbAddress.toLowerCase());
      if (wbnbToken) {
        const canRouteViaWBNB = await Promise.all([
          this.canSwapDirectly(tokenIn, wbnbToken),
          this.canSwapDirectly(wbnbToken, tokenOut)
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
        this.canSwapDirectly(tokenIn, usdtToken),
        this.canSwapDirectly(usdtToken, tokenOut)
      ]);

      if (canRouteViaUSDT[0] && canRouteViaUSDT[1]) {
        return [addressIn, usdtToken.address, addressOut];
      }
    }

    // Try routing through BUSD (BSC-specific stablecoin)
    const busdToken = this.config.tokens.find(t => t.symbol === 'BUSD');
    if (busdToken && addressIn !== busdToken.address && addressOut !== busdToken.address) {
      const canRouteViaBUSD = await Promise.all([
        this.canSwapDirectly(tokenIn, busdToken),
        this.canSwapDirectly(busdToken, tokenOut)
      ]);

      if (canRouteViaBUSD[0] && canRouteViaBUSD[1]) {
        return [addressIn, busdToken.address, addressOut];
      }
    }

    // No route found
    return [];
  }
}
