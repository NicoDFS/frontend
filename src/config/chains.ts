import { defineChain } from 'viem'
import { arbitrum, bsc, polygon } from 'viem/chains'

// KalyChain Mainnet Configuration
export const kalychain = defineChain({
  id: 3888,
  name: 'KalyChain',
  nativeCurrency: {
    decimals: 18,
    name: 'KalyChain',
    symbol: 'KLC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.kalychain.io/rpc'],
    },
    public: {
      http: ['https://rpc.kalychain.io/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'KalyChain Explorer',
      url: 'https://kalyscan.io',
    },
  },
  contracts: {
    // Add multicall contract if available
    // multicall3: {
    //   address: '0x...',
    //   blockCreated: 0,
    // },
  },
  // Add custom icon for Rainbow Kit
  iconUrl: '/tokens/klc.png',
})

// KalyChain Testnet Configuration (for future use)
export const kalychainTestnet = defineChain({
  id: 3889, // Assuming testnet chain ID
  name: 'KalyChain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'KalyChain',
    symbol: 'KLC',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.kalychain.io/rpc'], // Update with actual testnet RPC
    },
    public: {
      http: ['https://testnet-rpc.kalychain.io/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'KalyChain Testnet Explorer',
      url: 'https://testnet.kalyscan.io', // Update with actual testnet explorer
    },
  },
  testnet: true,
  // Add custom icon for Rainbow Kit
  iconUrl: '/tokens/klc.png',
})

// Bridge-supported chains - Required for bridge functionality
export const supportedChains = [
  kalychain,
  arbitrum,
  bsc,
  polygon,
  // kalychainTestnet, // Uncomment when testnet is available
] as const

// Helper function to get chain by ID
export function getChainById(chainId: number) {
  return supportedChains.find(chain => chain.id === chainId)
}

// Helper function to check if chain is supported
export function isSupportedChain(chainId: number): boolean {
  return supportedChains.some(chain => chain.id === chainId)
}

// Default chain for the application
export const DEFAULT_CHAIN = kalychain

// Chain-specific configuration
export const CHAIN_CONFIG = {
  [kalychain.id]: {
    name: 'KalyChain',
    shortName: 'KLC',
    isTestnet: false,
    faucetUrl: null,
    bridgeUrl: null, // Add bridge URL when available
  },
  [arbitrum.id]: {
    name: 'Arbitrum One',
    shortName: 'ARB',
    isTestnet: false,
    faucetUrl: null,
    bridgeUrl: null,
  },
  [bsc.id]: {
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    isTestnet: false,
    faucetUrl: null,
    bridgeUrl: null,
  },
  [polygon.id]: {
    name: 'Polygon',
    shortName: 'POL',
    isTestnet: false,
    faucetUrl: null,
    bridgeUrl: null,
  },
  [kalychainTestnet.id]: {
    name: 'KalyChain Testnet',
    shortName: 'KLC-T',
    isTestnet: true,
    faucetUrl: 'https://faucet.kalychain.io', // Update with actual faucet URL
    bridgeUrl: null,
  },
} as const

// Export types for TypeScript
export type SupportedChain = typeof supportedChains[number]
export type ChainId = SupportedChain['id']
