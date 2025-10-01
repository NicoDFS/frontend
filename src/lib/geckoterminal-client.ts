/**
 * GeckoTerminal API Client
 * Free DEX data API by CoinGecko for OHLC chart data
 * Documentation: https://www.geckoterminal.com/dex-api
 */

import { Token } from '@/config/dex/types';

const GECKOTERMINAL_API_BASE = 'https://api.geckoterminal.com/api/v2';

// Rate limiting: 30 calls/minute for free tier
const RATE_LIMIT_DELAY = 2100; // 2.1 seconds between calls (safe margin)
let lastApiCall = 0;

// Cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * Network IDs for GeckoTerminal API
 */
const NETWORK_IDS: Record<number, string> = {
  56: 'bsc', // Binance Smart Chain
  42161: 'arbitrum', // Arbitrum One
};

/**
 * Rate-limited fetch with caching
 */
async function rateLimitedFetch(url: string): Promise<any> {
  // Check cache first
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📦 GeckoTerminal: Using cached data for ${url}`);
    return cached.data;
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;

  if (timeSinceLastCall < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastCall;
    console.log(`⏳ GeckoTerminal: Rate limiting, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastApiCall = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`GeckoTerminal API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the result
    cache.set(url, {
      data,
      timestamp: Date.now()
    });

    return data;
  } catch (error) {
    console.error('❌ GeckoTerminal API error:', error);
    throw error;
  }
}

/**
 * Get network ID for GeckoTerminal API
 */
function getNetworkId(chainId: number): string | null {
  return NETWORK_IDS[chainId] || null;
}

/**
 * Search for a pool address given two token addresses
 * Tries searching both tokens to maximize chances of finding the pool
 */
export async function findPoolAddress(
  chainId: number,
  tokenA: Token,
  tokenB: Token
): Promise<string | null> {
  try {
    const networkId = getNetworkId(chainId);
    if (!networkId) {
      console.warn(`⚠️ GeckoTerminal: Unsupported chain ${chainId}`);
      return null;
    }

    const tokenAAddr = tokenA.address.toLowerCase();
    const tokenBAddr = tokenB.address.toLowerCase();

    // Helper function to search pools for a specific token
    const searchTokenPools = async (token: Token, otherTokenAddr: string): Promise<string | null> => {
      const url = `${GECKOTERMINAL_API_BASE}/networks/${networkId}/tokens/${token.address.toLowerCase()}/pools`;
      const response = await rateLimitedFetch(url);

      if (!response?.data || !Array.isArray(response.data)) {
        return null;
      }

      // Find a pool that contains both tokens
      for (const pool of response.data) {
        const baseToken = pool.relationships?.base_token?.data?.id?.split('_')[1]?.toLowerCase();
        const quoteToken = pool.relationships?.quote_token?.data?.id?.split('_')[1]?.toLowerCase();

        if (
          (baseToken === token.address.toLowerCase() && quoteToken === otherTokenAddr) ||
          (baseToken === otherTokenAddr && quoteToken === token.address.toLowerCase())
        ) {
          const poolAddress = pool.id?.split('_')[1];
          if (poolAddress) {
            console.log(`✅ GeckoTerminal: Found pool ${poolAddress} for ${tokenA.symbol}/${tokenB.symbol}`);
            return poolAddress;
          }
        }
      }

      return null;
    };

    // Try searching tokenA's pools first
    console.log(`🔍 GeckoTerminal: Searching ${tokenA.symbol} pools for ${tokenA.symbol}/${tokenB.symbol} pair...`);
    let poolAddress = await searchTokenPools(tokenA, tokenBAddr);

    if (poolAddress) {
      return poolAddress;
    }

    // If not found, try searching tokenB's pools
    console.log(`🔍 GeckoTerminal: Searching ${tokenB.symbol} pools for ${tokenA.symbol}/${tokenB.symbol} pair...`);
    poolAddress = await searchTokenPools(tokenB, tokenAAddr);

    if (poolAddress) {
      return poolAddress;
    }

    console.warn(`⚠️ GeckoTerminal: No pool found for ${tokenA.symbol}/${tokenB.symbol} after searching both tokens`);
    return null;
  } catch (error) {
    console.error(`❌ GeckoTerminal: Error finding pool for ${tokenA.symbol}/${tokenB.symbol}:`, error);
    return null;
  }
}

/**
 * Fetch OHLC data from GeckoTerminal
 * @param chainId - Chain ID (56 for BSC, 42161 for Arbitrum)
 * @param poolAddress - Pool/pair address
 * @param timeframe - Timeframe: 'day' (default), 'hour', 'minute'
 * @param aggregate - Aggregate: 1 (default), 5, 15, etc.
 * @param limit - Number of candles to return (default: 100, max: 1000)
 */
export async function getGeckoTerminalOHLC(
  chainId: number,
  poolAddress: string,
  timeframe: 'day' | 'hour' | 'minute' = 'hour',
  aggregate: number = 1,
  limit: number = 168 // 7 days of hourly data
): Promise<any[]> {
  try {
    const networkId = getNetworkId(chainId);
    if (!networkId) {
      console.warn(`⚠️ GeckoTerminal: Unsupported chain ${chainId}`);
      return [];
    }

    const url = `${GECKOTERMINAL_API_BASE}/networks/${networkId}/pools/${poolAddress.toLowerCase()}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}`;
    
    console.log(`🦎 GeckoTerminal: Fetching OHLC data from ${url}`);
    
    const response = await rateLimitedFetch(url);

    if (!response?.data?.attributes?.ohlcv_list || !Array.isArray(response.data.attributes.ohlcv_list)) {
      console.warn('⚠️ GeckoTerminal: Invalid OHLC response format');
      return [];
    }

    const ohlcvList = response.data.attributes.ohlcv_list;
    console.log(`✅ GeckoTerminal: Fetched ${ohlcvList.length} OHLC candles`);

    return ohlcvList;
  } catch (error) {
    console.error('❌ GeckoTerminal: Error fetching OHLC data:', error);
    return [];
  }
}

/**
 * Convert GeckoTerminal OHLC data to our chart format
 * GeckoTerminal format: [timestamp, open, high, low, close, volume]
 * Our format: { time, open, high, low, close, value }
 */
export function convertGeckoTerminalToChartData(ohlcvList: any[]): any[] {
  if (!Array.isArray(ohlcvList)) {
    return [];
  }

  const chartData = ohlcvList.map(candle => {
    if (!Array.isArray(candle) || candle.length < 6) {
      return null;
    }

    const [timestamp, open, high, low, close, volume] = candle;

    return {
      time: Math.floor(timestamp / 1000), // Convert ms to seconds
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      value: parseFloat(close) // For line charts
    };
  }).filter(Boolean); // Remove null entries

  // Sort by time in ascending order (required by chart library)
  chartData.sort((a, b) => a.time - b.time);

  return chartData;
}

/**
 * Get pool info from GeckoTerminal
 */
export async function getPoolInfo(
  chainId: number,
  poolAddress: string
): Promise<any | null> {
  try {
    const networkId = getNetworkId(chainId);
    if (!networkId) {
      return null;
    }

    const url = `${GECKOTERMINAL_API_BASE}/networks/${networkId}/pools/${poolAddress.toLowerCase()}`;
    const response = await rateLimitedFetch(url);

    if (!response?.data) {
      return null;
    }

    return response.data;
  } catch (error) {
    console.error('❌ GeckoTerminal: Error fetching pool info:', error);
    return null;
  }
}

/**
 * Check if a chain is supported by GeckoTerminal
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in NETWORK_IDS;
}

/**
 * Get supported chain IDs
 */
export function getSupportedChains(): number[] {
  return Object.keys(NETWORK_IDS).map(Number);
}

