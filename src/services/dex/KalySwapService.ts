// KalySwap DEX service implementation
// Handles all KalySwap-specific operations on KalyChain

import { BaseDexService } from './BaseDexService';
import { SwapParams, Token } from '@/config/dex/types';
import { KALYSWAP_CONFIG } from '@/config/dex/kalyswap';
import { DexError, SwapFailedError } from './IDexService';
import { useWalletClient } from 'wagmi';
import { getContract, parseUnits } from 'viem';

export class KalySwapService extends BaseDexService {
  constructor() {
    super(KALYSWAP_CONFIG);
  }

  getName(): string {
    return 'KalySwap';
  }

  getChainId(): number {
    return 3888; // KalyChain
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
        // ETH/KLC to Token
        txHash = await routerContract.write.swapExactETHForTokens([
          amountOutMin,
          route,
          params.to as `0x${string}`,
          BigInt(deadline)
        ], {
          value: amountIn
        }) as string;
      } else if (params.tokenOut.isNative) {
        // Token to ETH/KLC
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
      console.error('KalySwap executeSwap error:', error);
      if (error instanceof DexError) {
        throw error;
      }
      throw new SwapFailedError(this.getName(), error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // KalySwap-specific helper methods
  async getKLCPrice(): Promise<number> {
    try {
      // Get KLC/USDT pair price
      const klcToken = this.config.tokens.find(t => t.isNative);
      const usdtToken = this.config.tokens.find(t => t.symbol === 'USDT');

      if (!klcToken || !usdtToken) {
        return 0;
      }

      const pairInfo = await this.getPairInfo(klcToken, usdtToken);
      if (!pairInfo) {
        return 0;
      }

      // Calculate price from reserves
      const klcReserve = parseFloat(pairInfo.reserve0);
      const usdtReserve = parseFloat(pairInfo.reserve1);

      return usdtReserve / klcReserve;
    } catch (error) {
      console.error('Error getting KLC price:', error);
      return 0;
    }
  }

  async getKSWAPPrice(): Promise<number> {
    try {
      // Get KSWAP/KLC pair price, then convert to USD
      const kswapToken = this.config.tokens.find(t => t.symbol === 'KSWAP');
      const klcToken = this.config.tokens.find(t => t.isNative);

      if (!kswapToken || !klcToken) {
        return 0;
      }

      const pairInfo = await this.getPairInfo(kswapToken, klcToken);
      if (!pairInfo) {
        return 0;
      }

      // Calculate KSWAP price in KLC
      const kswapReserve = parseFloat(pairInfo.reserve0);
      const klcReserve = parseFloat(pairInfo.reserve1);
      const kswapPriceInKLC = klcReserve / kswapReserve;

      // Get KLC price in USD
      const klcPriceUSD = await this.getKLCPrice();

      return kswapPriceInKLC * klcPriceUSD;
    } catch (error) {
      console.error('Error getting KSWAP price:', error);
      return 0;
    }
  }

  // Override route calculation for KalySwap-specific routing
  async getSwapRoute(tokenIn: Token, tokenOut: Token): Promise<string[]> {
    const addressIn = tokenIn.isNative ? this.getWethAddress() : tokenIn.address;
    const addressOut = tokenOut.isNative ? this.getWethAddress() : tokenOut.address;

    // Check direct pair first
    const directPairExists = await this.canSwapDirectly(tokenIn, tokenOut);
    if (directPairExists) {
      return [addressIn, addressOut];
    }

    // Try routing through wKLC
    const wklcAddress = this.getWethAddress();
    if (addressIn !== wklcAddress && addressOut !== wklcAddress) {
      const wklcToken = this.config.tokens.find(t => t.address.toLowerCase() === wklcAddress.toLowerCase());
      if (wklcToken) {
        const canRouteViaWKLC = await Promise.all([
          this.canSwapDirectly(tokenIn, wklcToken),
          this.canSwapDirectly(wklcToken, tokenOut)
        ]);

        if (canRouteViaWKLC[0] && canRouteViaWKLC[1]) {
          return [addressIn, wklcAddress, addressOut];
        }
      }
    }

    // Try routing through USDT (major stablecoin on KalyChain)
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

    // No route found
    return [];
  }
}
