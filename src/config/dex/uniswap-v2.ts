import { DexConfig } from './types';
import { ARBITRUM_TOKENS } from './tokens/arbitrum';
import { UNISWAP_V2_ROUTER_ABI, UNISWAP_V2_FACTORY_ABI } from '../abis';

export const UNISWAP_V2_CONFIG: DexConfig = {
  name: 'Uniswap V2',
  factory: '0xf1D7CC64Fb4452F05c498126312eBE29f30Fbcf9', // Uniswap V2 Factory on Arbitrum
  router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router on Arbitrum
  subgraphUrl: 'https://gateway.thegraph.com/api/subgraphs/id/CStW6CSQbHoXsgKuVCrk3uShGA4JX3CAzzv2x9zaGf8w',
  tokens: ARBITRUM_TOKENS,
  routerABI: UNISWAP_V2_ROUTER_ABI,
  factoryABI: UNISWAP_V2_FACTORY_ABI,
  wethAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arbitrum
  nativeToken: {
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
  },
};

// Uniswap V2 specific constants
export const UNISWAP_V2_CONSTANTS = {
  CHAIN_ID: 42161,
  INIT_CODE_HASH: '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f', // Uniswap V2 init code hash
  MINIMUM_LIQUIDITY: 1000,
  FEE_DENOMINATOR: 10000,
  FEE_NUMERATOR: 30, // 0.3% fee
} as const;

// Helper functions for Uniswap V2
export function getUniswapV2PairAddress(tokenA: string, tokenB: string): string {
  // Calculate pair address using CREATE2
  const { getCreate2Address } = require('viem');

  // Sort tokens (Uniswap V2 standard)
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];

  // Encode packed for salt
  const salt = require('viem').keccak256(
    require('viem').encodePacked(['address', 'address'], [token0 as `0x${string}`, token1 as `0x${string}`])
  );

  return getCreate2Address({
    from: UNISWAP_V2_CONFIG.factory as `0x${string}`,
    salt,
    bytecodeHash: UNISWAP_V2_CONSTANTS.INIT_CODE_HASH as `0x${string}`,
  });
}

export function isUniswapV2Token(address: string): boolean {
  return ARBITRUM_TOKENS.some(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}
