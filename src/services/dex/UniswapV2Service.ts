// Uniswap V2 DEX service implementation
// Handles all Uniswap V2-specific operations on Arbitrum

import { BaseDexService } from './BaseDexService';
import { SwapParams, Token } from '@/config/dex/types';
import { UNISWAP_V2_CONFIG } from '@/config/dex/uniswap-v2';
import { DexError, SwapFailedError } from './IDexService';
import { useWalletClient } from 'wagmi';
import { getContract, parseUnits } from 'viem';

export class UniswapV2Service extends BaseDexService {
  constructor() {
    super(UNISWAP_V2_CONFIG);
  }

  getName(): string {
    return 'Uniswap V2';
  }

  getChainId(): number {
    return 42161; // Arbitrum
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
        // ETH to Token
        txHash = await routerContract.write.swapExactETHForTokens([
          amountOutMin,
          route,
          params.to as `0x${string}`,
          BigInt(deadline)
        ], {
          value: amountIn
        }) as string;
      } else if (params.tokenOut.isNative) {
        // Token to ETH
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
      console.error('Uniswap V2 executeSwap error:', error);
      if (error instanceof DexError) {
        throw error;
      }
      throw new SwapFailedError(this.getName(), error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Uniswap V2-specific helper methods
  async getETHPrice(): Promise<number> {
    try {
      // Get ETH/USDC pair price
      const ethToken = this.config.tokens.find(t => t.isNative);
      const usdcToken = this.config.tokens.find(t => t.symbol === 'USDC');

      if (!ethToken || !usdcToken) {
        return 0;
      }

      const pairInfo = await this.getPairInfo(ethToken, usdcToken);
      if (!pairInfo) {
        return 0;
      }

      // Calculate price from reserves
      const ethReserve = parseFloat(pairInfo.reserve0);
      const usdcReserve = parseFloat(pairInfo.reserve1);

      return usdcReserve / ethReserve;
    } catch (error) {
      console.error('Error getting ETH price:', error);
      return 0;
    }
  }

  async getARBPrice(): Promise<number> {
    try {
      // Get ARB/ETH pair price, then convert to USD
      const arbToken = this.config.tokens.find(t => t.symbol === 'ARB');
      const ethToken = this.config.tokens.find(t => t.isNative);

      if (!arbToken || !ethToken) {
        return 0;
      }

      const pairInfo = await this.getPairInfo(arbToken, ethToken);
      if (!pairInfo) {
        return 0;
      }

      // Calculate ARB price in ETH
      const arbReserve = parseFloat(pairInfo.reserve0);
      const ethReserve = parseFloat(pairInfo.reserve1);
      const arbPriceInETH = ethReserve / arbReserve;

      // Get ETH price in USD
      const ethPriceUSD = await this.getETHPrice();

      return arbPriceInETH * ethPriceUSD;
    } catch (error) {
      console.error('Error getting ARB price:', error);
      return 0;
    }
  }

  // Override route calculation for Uniswap V2-specific routing
  async getSwapRoute(tokenIn: Token, tokenOut: Token): Promise<string[]> {
    const addressIn = tokenIn.isNative ? this.getWethAddress() : tokenIn.address;
    const addressOut = tokenOut.isNative ? this.getWethAddress() : tokenOut.address;

    // Check direct pair first
    const directPairExists = await this.canSwapDirectly(tokenIn, tokenOut);
    if (directPairExists) {
      return [addressIn, addressOut];
    }

    // Try routing through WETH
    const wethAddress = this.getWethAddress();
    if (addressIn !== wethAddress && addressOut !== wethAddress) {
      const wethToken = this.config.tokens.find(t => t.address.toLowerCase() === wethAddress.toLowerCase());
      if (wethToken) {
        const canRouteViaWETH = await Promise.all([
          this.canSwapDirectly(tokenIn, wethToken),
          this.canSwapDirectly(wethToken, tokenOut)
        ]);

        if (canRouteViaWETH[0] && canRouteViaWETH[1]) {
          return [addressIn, wethAddress, addressOut];
        }
      }
    }

    // Try routing through USDC (major stablecoin on Arbitrum)
    const usdcToken = this.config.tokens.find(t => t.symbol === 'USDC');
    if (usdcToken && addressIn !== usdcToken.address && addressOut !== usdcToken.address) {
      const canRouteViaUSDC = await Promise.all([
        this.canSwapDirectly(tokenIn, usdcToken),
        this.canSwapDirectly(usdcToken, tokenOut)
      ]);

      if (canRouteViaUSDC[0] && canRouteViaUSDC[1]) {
        return [addressIn, usdcToken.address, addressOut];
      }
    }

    // Try routing through USDT
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
