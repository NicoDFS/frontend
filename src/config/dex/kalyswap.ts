import { DexConfig } from './types';
import { KALYCHAIN_TOKENS } from './tokens/kalychain';
import { ROUTER_ABI, FACTORY_ABI } from '../abis';

export const KALYSWAP_CONFIG: DexConfig = {
  name: 'KalySwap',
  factory: '0xD42Af909d323D88e0E933B6c50D3e91c279004ca',
  router: '0x183F288BF7EEBe1A3f318F4681dF4a70ef32B2f3',
  subgraphUrl: process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'https://localhost:8000/subgraphs/name/kalyswap/dex-subgraph', 
  tokens: KALYCHAIN_TOKENS,
  routerABI: ROUTER_ABI,
  factoryABI: FACTORY_ABI,
  wethAddress: '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3', // wKLC
  nativeToken: {
    symbol: 'KLC',
    name: 'KalyCoin',
    decimals: 18,
  },
};

// KalySwap specific constants
export const KALYSWAP_CONSTANTS = {
  CHAIN_ID: 3888,
  INIT_CODE_HASH: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f', // KalySwap init code hash
  MINIMUM_LIQUIDITY: 1000,
  FEE_DENOMINATOR: 10000,
  FEE_NUMERATOR: 30, // 0.3% fee
} as const;

// Helper functions for KalySwap
export function getKalySwapPairAddress(tokenA: string, tokenB: string): string {
  // This would calculate the pair address using CREATE2
  // For now, return empty string - will be implemented in service layer
  return '';
}

export function isKalySwapToken(address: string): boolean {
  return KALYCHAIN_TOKENS.some(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}
