// Main DEX service that routes to the appropriate DEX implementation
// This is the entry point for all DEX operations

import { IDexService, DexError } from './IDexService';
import { Token, QuoteResult, SwapParams, PairInfo, isSupportedDexChain } from '@/config/dex/types';
import { getDexConfig } from '@/config/dex';
import type { PublicClient, WalletClient } from 'viem';

// Lazy imports to avoid circular dependencies
let KalySwapService: any;
let PancakeSwapService: any;
let UniswapV2Service: any;

export class DexService {
  private static instances: Map<number, IDexService> = new Map();

  /**
   * Get the appropriate DEX service for a chain
   */
  static async getDexService(chainId: number): Promise<IDexService> {
    if (!isSupportedDexChain(chainId)) {
      throw new DexError(`Chain ${chainId} is not supported for DEX operations`, 'UNSUPPORTED_CHAIN', 'DexService');
    }

    // Return cached instance if available
    if (this.instances.has(chainId)) {
      return this.instances.get(chainId)!;
    }

    // Create new instance based on chain
    let service: IDexService;

    switch (chainId) {
      case 3888: // KalyChain
        if (!KalySwapService) {
          const { KalySwapService: Service } = await import('./KalySwapService');
          KalySwapService = Service;
        }
        service = new KalySwapService();
        break;

      case 56: // BSC
        if (!PancakeSwapService) {
          const { PancakeSwapService: Service } = await import('./PancakeSwapService');
          PancakeSwapService = Service;
        }
        service = new PancakeSwapService();
        break;

      case 42161: // Arbitrum
        if (!UniswapV2Service) {
          const { UniswapV2Service: Service } = await import('./UniswapV2Service');
          UniswapV2Service = Service;
        }
        service = new UniswapV2Service();
        break;

      default:
        throw new DexError(`No DEX service available for chain ${chainId}`, 'NO_SERVICE', 'DexService');
    }

    // Cache the instance
    this.instances.set(chainId, service);
    return service;
  }

  /**
   * Get a quote for swapping tokens on a specific chain
   */
  static async getQuote(
    chainId: number,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    publicClient: PublicClient
  ): Promise<QuoteResult> {
    const service = await this.getDexService(chainId);
    return service.getQuote(tokenIn, tokenOut, amountIn, publicClient);
  }

  /**
   * Execute a token swap on a specific chain
   */
  static async executeSwap(chainId: number, params: SwapParams, walletClient: WalletClient): Promise<string> {
    const service = await this.getDexService(chainId);
    return service.executeSwap(params, walletClient);
  }

  /**
   * Get pair address for two tokens on a specific chain
   */
  static async getPairAddress(chainId: number, tokenA: Token, tokenB: Token, publicClient: PublicClient): Promise<string | null> {
    const service = await this.getDexService(chainId);
    return service.getPairAddress(tokenA, tokenB, publicClient);
  }

  /**
   * Get pair information for two tokens on a specific chain
   */
  static async getPairInfo(chainId: number, tokenA: Token, tokenB: Token, publicClient: PublicClient): Promise<PairInfo | null> {
    const service = await this.getDexService(chainId);
    return service.getPairInfo(tokenA, tokenB, publicClient);
  }

  /**
   * Get supported tokens for a specific chain
   */
  static async getTokenList(chainId: number): Promise<Token[]> {
    const service = await this.getDexService(chainId);
    return service.getTokenList();
  }

  /**
   * Get DEX name for a specific chain
   */
  static async getDexName(chainId: number): Promise<string> {
    const service = await this.getDexService(chainId);
    return service.getName();
  }

  /**
   * Check if a token is supported on a specific chain
   */
  static async isTokenSupported(chainId: number, tokenAddress: string): Promise<boolean> {
    const service = await this.getDexService(chainId);
    return service.isTokenSupported(tokenAddress);
  }

  /**
   * Get the best swap route for tokens on a specific chain
   */
  static async getSwapRoute(chainId: number, tokenIn: Token, tokenOut: Token, publicClient: PublicClient): Promise<string[]> {
    const service = await this.getDexService(chainId);
    return service.getSwapRoute(tokenIn, tokenOut, publicClient);
  }

  /**
   * Calculate price impact for a swap on a specific chain
   */
  static async calculatePriceImpact(
    chainId: number,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    publicClient: PublicClient
  ): Promise<number> {
    const service = await this.getDexService(chainId);
    return service.calculatePriceImpact(tokenIn, tokenOut, amountIn, publicClient);
  }

  /**
   * Check if two tokens can be swapped directly on a specific chain
   */
  static async canSwapDirectly(chainId: number, tokenA: Token, tokenB: Token, publicClient: PublicClient): Promise<boolean> {
    const service = await this.getDexService(chainId);
    return service.canSwapDirectly(tokenA, tokenB, publicClient);
  }

  /**
   * Get all supported chain IDs
   */
  static getSupportedChains(): number[] {
    return [3888, 56, 42161]; // KalyChain, BSC, Arbitrum
  }

  /**
   * Clear cached instances (useful for testing or when switching networks)
   */
  static clearCache(): void {
    this.instances.clear();
  }
}

// Export for convenience
export default DexService;
