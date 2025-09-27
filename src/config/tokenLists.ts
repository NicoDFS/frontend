/**
 * Token List Configuration
 * Centralized configuration for all token list URLs and settings
 */

import { TokenListConfig } from '@/services/tokenListService';

// Backend API endpoints for token lists (avoids CORS issues)
const TOKEN_LIST_URLS = {
  // KalyChain token lists (via backend proxy)
  KALYSWAP_DEFAULT: '/api/token-lists/kalyswap-default',

  // External token lists (via backend proxy)
  PANCAKESWAP_EXTENDED: '/api/token-lists/pancakeswap-extended',
  UNISWAP_DEFAULT: '/api/token-lists/uniswap-default',

  // Future token lists (disabled for now)
  KALYSWAP_EXTENDED: '/api/token-lists/kalyswap-extended',
  KALYSWAP_COMMUNITY: '/api/token-lists/kalyswap-community'
};

/**
 * Token list configurations per chain
 * Higher priority lists override lower priority ones for duplicate tokens
 */
export const TOKEN_LIST_CONFIGS: Record<number, TokenListConfig[]> = {
  // KalyChain (3888)
  3888: [
    {
      name: 'KalySwap Default',
      url: TOKEN_LIST_URLS.KALYSWAP_DEFAULT,
      priority: 100,
      enabled: true
    }
    // Future token lists can be added here:
    // {
    //   name: 'KalySwap Extended',
    //   url: TOKEN_LIST_URLS.KALYSWAP_EXTENDED,
    //   priority: 90,
    //   enabled: false
    // },
    // {
    //   name: 'KalySwap Community',
    //   url: TOKEN_LIST_URLS.KALYSWAP_COMMUNITY,
    //   priority: 80,
    //   enabled: false
    // }
  ],

  // Binance Smart Chain (56)
  56: [
    {
      name: 'PancakeSwap Extended',
      url: TOKEN_LIST_URLS.PANCAKESWAP_EXTENDED,
      priority: 100,
      enabled: true
    }
  ],

  // Arbitrum (42161)
  42161: [
    {
      name: 'Uniswap Default',
      url: TOKEN_LIST_URLS.UNISWAP_DEFAULT,
      priority: 100,
      enabled: true
    }
  ]
};

/**
 * Token list settings
 */
export const TOKEN_LIST_SETTINGS = {
  // Cache settings
  CACHE_TTL: 30 * 60 * 1000, // 30 minutes
  
  // Request settings
  REQUEST_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 2,
  
  // Validation settings
  MAX_TOKENS_PER_LIST: 10000,
  MIN_TOKEN_SYMBOL_LENGTH: 1,
  MAX_TOKEN_SYMBOL_LENGTH: 20,
  MIN_TOKEN_NAME_LENGTH: 1,
  MAX_TOKEN_NAME_LENGTH: 100,
  
  // UI settings
  DEFAULT_TOKENS_TO_SHOW: 50,
  SEARCH_MIN_QUERY_LENGTH: 1
};

/**
 * Get token list configurations for a specific chain
 */
export function getTokenListConfigs(chainId: number): TokenListConfig[] {
  return TOKEN_LIST_CONFIGS[chainId] || [];
}

/**
 * Get enabled token list configurations for a specific chain
 */
export function getEnabledTokenListConfigs(chainId: number): TokenListConfig[] {
  return getTokenListConfigs(chainId).filter(config => config.enabled);
}

/**
 * Check if a chain has token list support
 */
export function hasTokenListSupport(chainId: number): boolean {
  return getEnabledTokenListConfigs(chainId).length > 0;
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(TOKEN_LIST_CONFIGS).map(Number);
}

/**
 * Token list metadata for UI display
 */
export const TOKEN_LIST_METADATA = {
  3888: {
    name: 'KalyChain',
    symbol: 'KLC',
    logo: '/tokens/klc.png',
    explorer: 'https://kalyscan.io',
    rpc: 'https://rpc.kalychain.io/rpc'
  },
  56: {
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    logo: '/tokens/bnb.png',
    explorer: 'https://bscscan.com',
    rpc: 'https://bsc-dataseed.binance.org'
  },
  42161: {
    name: 'Arbitrum One',
    symbol: 'ETH',
    logo: '/tokens/eth.png',
    explorer: 'https://arbiscan.io',
    rpc: 'https://arb1.arbitrum.io/rpc'
  }
};

// Export URLs for external use
export { TOKEN_LIST_URLS };
