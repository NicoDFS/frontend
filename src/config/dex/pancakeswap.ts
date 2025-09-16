import { DexConfig } from './types';
import { BSC_TOKENS } from './tokens/bsc';
import { PANCAKESWAP_ROUTER_ABI, PANCAKESWAP_FACTORY_ABI } from '../abis';

export const PANCAKESWAP_CONFIG: DexConfig = {
  name: 'PancakeSwap',
  factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
  router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  subgraphUrl: 'https://gateway.thegraph.com/api/subgraphs/id/Aj9TDh9SPcn7cz4DXW26ga22VnBzHhPVuKGmE4YBzDFj', // PancakeSwap V2 subgraph
  tokens: BSC_TOKENS,
  routerABI: PANCAKESWAP_ROUTER_ABI,
  factoryABI: PANCAKESWAP_FACTORY_ABI,
  wethAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
  nativeToken: {
    symbol: 'BNB',
    name: 'BNB',
    decimals: 18,
  },
};

// PancakeSwap specific constants
export const PANCAKESWAP_CONSTANTS = {
  CHAIN_ID: 56,
  INIT_CODE_HASH: '0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5', // PancakeSwap init code hash
  MINIMUM_LIQUIDITY: 1000,
  FEE_DENOMINATOR: 10000,
  FEE_NUMERATOR: 25, // 0.25% fee
} as const;

// Helper functions for PancakeSwap
export function getPancakeSwapPairAddress(tokenA: string, tokenB: string): string {
  // This would calculate the pair address using CREATE2
  // For now, return empty string - will be implemented in service layer
  return '';
}

export function isPancakeSwapToken(address: string): boolean {
  return BSC_TOKENS.some(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}
