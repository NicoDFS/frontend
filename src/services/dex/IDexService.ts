// Interface for DEX service implementations
// This provides a common interface for all DEX protocols (KalySwap, PancakeSwap, Uniswap V2)

import { Token, QuoteResult, SwapParams, PairInfo } from '@/config/dex/types';

export interface IDexService {
  /**
   * Get the name of the DEX
   */
  getName(): string;

  /**
   * Get the chain ID this DEX operates on
   */
  getChainId(): number;

  /**
   * Get a quote for swapping tokens
   * @param tokenIn Input token
   * @param tokenOut Output token
   * @param amountIn Amount of input token
   * @returns Quote result with expected output amount and price impact
   */
  getQuote(tokenIn: Token, tokenOut: Token, amountIn: string): Promise<QuoteResult>;

  /**
   * Execute a token swap
   * @param params Swap parameters
   * @returns Transaction hash
   */
  executeSwap(params: SwapParams): Promise<string>;

  /**
   * Get the pair address for two tokens
   * @param tokenA First token
   * @param tokenB Second token
   * @returns Pair address or null if pair doesn't exist
   */
  getPairAddress(tokenA: Token, tokenB: Token): Promise<string | null>;

  /**
   * Get pair information including reserves
   * @param tokenA First token
   * @param tokenB Second token
   * @returns Pair information or null if pair doesn't exist
   */
  getPairInfo(tokenA: Token, tokenB: Token): Promise<PairInfo | null>;

  /**
   * Get the list of supported tokens
   * @returns Array of supported tokens
   */
  getTokenList(): Token[];

  /**
   * Get the router contract address
   * @returns Router contract address
   */
  getRouterAddress(): string;

  /**
   * Get the factory contract address
   * @returns Factory contract address
   */
  getFactoryAddress(): string;

  /**
   * Get the wrapped native token address
   * @returns Wrapped native token address (WETH, WBNB, wKLC, etc.)
   */
  getWethAddress(): string;

  /**
   * Check if a token is supported by this DEX
   * @param tokenAddress Token contract address
   * @returns True if token is supported
   */
  isTokenSupported(tokenAddress: string): boolean;

  /**
   * Get the subgraph URL for this DEX
   * @returns Subgraph URL
   */
  getSubgraphUrl(): string;

  /**
   * Calculate price impact for a swap
   * @param tokenIn Input token
   * @param tokenOut Output token
   * @param amountIn Amount of input token
   * @returns Price impact percentage
   */
  calculatePriceImpact(tokenIn: Token, tokenOut: Token, amountIn: string): Promise<number>;

  /**
   * Get the minimum amount out for a swap with slippage tolerance
   * @param amountOut Expected output amount
   * @param slippageTolerance Slippage tolerance percentage (e.g., 0.5 for 0.5%)
   * @returns Minimum amount out
   */
  getAmountOutMin(amountOut: string, slippageTolerance: number): string;

  /**
   * Check if two tokens can be swapped directly (pair exists)
   * @param tokenA First token
   * @param tokenB Second token
   * @returns True if direct swap is possible
   */
  canSwapDirectly(tokenA: Token, tokenB: Token): Promise<boolean>;

  /**
   * Get the best route for swapping tokens (may include intermediate tokens)
   * @param tokenIn Input token
   * @param tokenOut Output token
   * @returns Array of token addresses representing the swap route
   */
  getSwapRoute(tokenIn: Token, tokenOut: Token): Promise<string[]>;
}

// Error types for DEX operations
export class DexError extends Error {
  constructor(message: string, public code: string, public dexName: string) {
    super(message);
    this.name = 'DexError';
  }
}

export class InsufficientLiquidityError extends DexError {
  constructor(dexName: string, tokenA: string, tokenB: string) {
    super(`Insufficient liquidity for ${tokenA}/${tokenB} pair`, 'INSUFFICIENT_LIQUIDITY', dexName);
  }
}

export class PairNotFoundError extends DexError {
  constructor(dexName: string, tokenA: string, tokenB: string) {
    super(`Pair not found for ${tokenA}/${tokenB}`, 'PAIR_NOT_FOUND', dexName);
  }
}

export class UnsupportedTokenError extends DexError {
  constructor(dexName: string, tokenAddress: string) {
    super(`Token ${tokenAddress} is not supported`, 'UNSUPPORTED_TOKEN', dexName);
  }
}

export class SwapFailedError extends DexError {
  constructor(dexName: string, reason: string) {
    super(`Swap failed: ${reason}`, 'SWAP_FAILED', dexName);
  }
}
