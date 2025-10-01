// Types for DEX configuration system

export interface Token {
  chainId: number;
  address: string;
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  isNative?: boolean;
  coingeckoId?: string; // CoinGecko coin ID for dynamic chart data
}

export interface DexConfig {
  name: string;
  factory: string;
  router: string;
  quoter?: string; // For V3 DEXes
  subgraphUrl: string;
  tokens: Token[];
  routerABI: any;
  factoryABI: any;
  wethAddress: string; // Wrapped native token address
  nativeToken: {
    symbol: string;
    name: string;
    decimals: number;
  };
}

export interface QuoteResult {
  amountOut: string;
  priceImpact: number;
  route: string[];
  gasEstimate?: string;
}

export interface SwapParams {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOutMin: string;
  to: string;
  deadline: number;
  slippageTolerance: number;
}

export interface PairInfo {
  token0: Token;
  token1: Token;
  pairAddress: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
}

// DEX Protocol Types
export type DexProtocol = 'kalyswap' | 'pancakeswap' | 'uniswap-v2';

// Supported Chain IDs
export const SUPPORTED_DEX_CHAINS = [3888, 56, 42161] as const;
export type SupportedDexChainId = typeof SUPPORTED_DEX_CHAINS[number];

// Helper function to check if chain supports DEX
export function isSupportedDexChain(chainId: number): chainId is SupportedDexChainId {
  return SUPPORTED_DEX_CHAINS.includes(chainId as SupportedDexChainId);
}
