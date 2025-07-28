'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import { getPairAddress } from '@/utils/priceImpact';
import { getFactoryData, getPairsData, getKalyswapDayData } from '@/lib/subgraph-client';

// Import DEX contract ABIs
import pairABI from '@/config/abis/dex/pairABI.json';
import routerABI from '@/config/abis/dex/routerABI.json';
import erc20ABI from '@/config/abis/dex/erc20ABI.json';

// DEX Contract addresses
const DEX_CONTRACTS = {
  ROUTER: '0x183F288BF7EEBe1A3f318F4681dF4a4681dF4a70ef32B2f3',
  WKLC_USDT_PAIR: '0x25FDDaF836d12dC5e285823a644bb86E0b79c8e2',
  WKLC: '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3', // Actual wKLC token address from pair
  USDT: '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A', // USDT token address
};

// RPC endpoint for KalyChain
const RPC_URL = 'https://rpc.kalychain.io/rpc';

// Price data interface
export interface PricePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TokenPair {
  baseToken: string;
  quoteToken: string;
}

// DEX Market Stats interface
interface DexMarketStats {
  klcPrice: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  totalLiquidity: number | null;
  isLoading: boolean;
  error: string | null;
}

// Generate mock data for demonstration (shared utility function)
function generateMockPriceData(baseToken: string, quoteToken: string): PricePoint[] {
  const data: PricePoint[] = [];
  const now = Math.floor(Date.now() / 1000);
  const basePrice = baseToken === 'KLC' || baseToken === 'wKLC' ? 0.0003 : 1.0;

  // Generate 100 data points
  for (let i = 99; i >= 0; i--) {
    const time = now - (i * 3600); // 1 hour intervals
    const randomFactor = 0.95 + Math.random() * 0.1; // ±5% variation
    const price = basePrice * randomFactor;
    const volatility = 0.02; // 2% volatility

    const open = price;
    const close = price * (0.98 + Math.random() * 0.04); // ±2% from open
    const high = Math.max(open, close) * (1 + Math.random() * volatility);
    const low = Math.min(open, close) * (1 - Math.random() * volatility);
    const volume = Math.floor(Math.random() * 1000000);

    data.push({
      time,
      open: parseFloat(open.toFixed(8)),
      high: parseFloat(high.toFixed(8)),
      low: parseFloat(low.toFixed(8)),
      close: parseFloat(close.toFixed(8)),
      volume,
    });
  }

  return data;
}

// Hook for fetching price data
export function usePriceData(pair: TokenPair, timeframe: string = '1h') {
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
  const [volume24h, setVolume24h] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  // Fetch CoinGecko data for KLC/USDT
  const fetchCoinGeckoData = useCallback(async () => {
    try {
      // Check if this is KLC/USDT pair
      const isKlcUsdtPair = (pair.baseToken === 'KLC' || pair.baseToken === 'wKLC') && (pair.quoteToken === 'USDT' || pair.quoteToken === 'USDt');

      console.log('fetchCoinGeckoData called:', {
        baseToken: pair.baseToken,
        quoteToken: pair.quoteToken,
        isKlcUsdtPair,
        timeframe
      });

      if (!isKlcUsdtPair) {
        // Use mock data for non-KLC/USDT pairs
        const mockData = generateMockPriceData(pair.baseToken, pair.quoteToken);
        setPriceData(mockData);

        if (mockData.length > 0) {
          const latest = mockData[mockData.length - 1];
          setCurrentPrice(latest.close);
          setPriceChange24h(2.5); // Mock change
          setVolume24h(12345); // Mock volume
        }
        return;
      }

      // Fetch real CoinGecko data for KLC
      const days = timeframe === '1d' ? 1 : timeframe === '1w' ? 7 : timeframe === '1M' ? 30 : 1;
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/kalycoin/ohlc?vs_currency=usd&days=${days}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const ohlcData = await response.json();

      // Validate the response
      if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
        throw new Error('Invalid CoinGecko data format');
      }

      // Convert CoinGecko OHLC data to our format
      // CoinGecko format: [timestamp, open, high, low, close]
      const formattedData: PricePoint[] = ohlcData.map((item: number[]) => ({
        time: Math.floor(item[0] / 1000), // Convert milliseconds to seconds
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
        volume: Math.random() * 10000 + 5000, // Mock volume since CoinGecko OHLC doesn't include it
      }));

      console.log(`Fetched ${formattedData.length} data points from CoinGecko for KLC`);

      setPriceData(formattedData);

      if (formattedData.length > 0) {
        const latest = formattedData[formattedData.length - 1];
        const first = formattedData[0];

        setCurrentPrice(latest.close);

        // Calculate 24h change
        const change = ((latest.close - first.close) / first.close) * 100;
        setPriceChange24h(change);

        // Calculate volume
        const volume = formattedData.reduce((sum, point) => sum + point.volume, 0);
        setVolume24h(volume);

        console.log(`KLC Chart Data: Price=${latest.close}, Change=${change.toFixed(2)}%`);
      }

    } catch (err) {
      console.error('CoinGecko API error:', err);
      // Fallback to mock data on error
      const mockData = generateMockPriceData(pair.baseToken, pair.quoteToken);
      setPriceData(mockData);

      if (mockData.length > 0) {
        const latest = mockData[mockData.length - 1];
        setCurrentPrice(latest.close);
        setPriceChange24h(2.5);
        setVolume24h(12345);
      }
    }
  }, [pair.baseToken, pair.quoteToken, timeframe, generateMockPriceData]);

  // Fetch price data
  const fetchPriceData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await fetchCoinGeckoData();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchCoinGeckoData]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchPriceData();
  }, [fetchPriceData]);

  // Set up real-time updates (mock for now)
  useEffect(() => {
    const interval = setInterval(() => {
      if (priceData.length > 0) {
        const lastPrice = priceData[priceData.length - 1];
        const newPrice = lastPrice.close * (0.999 + Math.random() * 0.002); // ±0.1% change
        
        setCurrentPrice(newPrice);
        
        // Update the last data point with new price
        setPriceData(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              close: newPrice,
              high: Math.max(updated[updated.length - 1].high, newPrice),
              low: Math.min(updated[updated.length - 1].low, newPrice),
            };
          }
          return updated;
        });
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [priceData]);

  // Refresh data manually
  const refreshData = useCallback(() => {
    fetchPriceData();
  }, [fetchPriceData]);

  return {
    priceData,
    currentPrice,
    priceChange24h,
    volume24h,
    isLoading,
    error,
    refreshData,
  };
}

// Hook for getting current token price from subgraph
export function useTokenPrice(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTokenPrice = async () => {
      try {
        setIsLoading(true);
        console.log('🔍 Fetching price for token:', symbol);

        // Get token address mapping
        const tokenAddressMap: Record<string, string> = {
          'KLC': '0x069255299bb729399f3cecabdc73d15d3d10a2a3', // wKLC address (KLC = wKLC for pricing)
          'wKLC': '0x069255299bb729399f3cecabdc73d15d3d10a2a3',
          'USDT': '0x2ca775c77b922a51fcf3097f52bffdbc0250d99a',
          'USDt': '0x2ca775c77b922a51fcf3097f52bffdbc0250d99a',
          'KSWAP': '0xcc93b84ceed74dc28c746b7697d6fa477ffff65a',
          'DAI': '0x6e92cac380f7a7b86f4163fad0df2f277b16edc6',
          'CLISHA': '0x376e0ac0b55aa79f9b30aac8842e5e84ff06360c'
        };

        const tokenAddress = tokenAddressMap[symbol];
        if (!tokenAddress) {
          // Fallback to mock data for unknown tokens
          const mockPrices: Record<string, { price: number; change: number }> = {
            'USDC': { price: 1.0, change: -0.05 },
            'WBTC': { price: 43250.0, change: 1.8 },
            'ETH': { price: 2650.0, change: 3.2 },
            'BNB': { price: 315.0, change: -1.2 },
            'POL': { price: 0.45, change: 4.1 },
          };
          const tokenData = mockPrices[symbol] || { price: 1.0, change: 0 };
          setPrice(tokenData.price);
          setChange24h(tokenData.change);
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query GetTokenPrice($tokenId: String!) {
                token(id: $tokenId) {
                  id
                  symbol
                  derivedKLC
                  tradeVolumeUSD
                }
                # Get USDT pairs to calculate USD price
                pairs(where: {
                  or: [
                    { and: [{ token0: $tokenId }, { token1: "0x2ca775c77b922a51fcf3097f52bffdbc0250d99a" }] },
                    { and: [{ token0: "0x2ca775c77b922a51fcf3097f52bffdbc0250d99a" }, { token1: $tokenId }] }
                  ]
                }) {
                  id
                  token0 { id symbol }
                  token1 { id symbol }
                  reserve0
                  reserve1
                  token0Price
                  token1Price
                }
              }
            `,
            variables: {
              tokenId: tokenAddress.toLowerCase()
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('📊 Token price response:', result);

          if (result.errors) {
            throw new Error(result.errors[0].message);
          }

          let calculatedPrice = 0;

          if (result.data?.pairs && result.data.pairs.length > 0) {
            const pair = result.data.pairs[0];

            // Calculate price based on reserves
            if (pair.token0.id.toLowerCase() === tokenAddress.toLowerCase()) {
              // Token is token0, price = reserve1 / reserve0
              calculatedPrice = parseFloat(pair.reserve1) / parseFloat(pair.reserve0);
            } else {
              // Token is token1, price = reserve0 / reserve1
              calculatedPrice = parseFloat(pair.reserve0) / parseFloat(pair.reserve1);
            }
          } else if (symbol === 'USDT' || symbol === 'USDt') {
            // USDT is our base currency
            calculatedPrice = 1.0;
          } else {
            // Fallback: use derivedKLC * estimated KLC price
            const derivedKLC = result.data?.token?.derivedKLC;
            if (derivedKLC) {
              calculatedPrice = parseFloat(derivedKLC) * 0.0003; // Estimated KLC price
            }
          }

          setPrice(calculatedPrice);
          setChange24h(2.5); // TODO: Calculate actual 24h change from historical data

        } else {
          throw new Error('Failed to fetch token price');
        }
      } catch (err) {
        console.error('❌ Error fetching token price:', err);
        // Fallback to mock data
        const mockPrices: Record<string, { price: number; change: number }> = {
          'KLC': { price: 0.0003, change: 2.5 },
          'wKLC': { price: 0.0003, change: 2.5 },
          'USDt': { price: 1.0, change: 0.1 },
          'USDT': { price: 1.0, change: 0.1 },
          'KSWAP': { price: 0.15, change: 8.7 },
        };
        const tokenData = mockPrices[symbol] || { price: 1.0, change: 0 };
        setPrice(tokenData.price);
        setChange24h(tokenData.change);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenPrice();

    // Set up periodic price updates
    const interval = setInterval(fetchTokenPrice, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [symbol]);

  return { price, change24h, isLoading };
}

// Utility function to format price based on token
export function formatTokenPrice(price: number, symbol: string): string {
  if (symbol === 'KLC' || symbol === 'wKLC') {
    return price.toFixed(8);
  } else if (['USDt', 'USDC', 'DAI'].includes(symbol)) {
    return price.toFixed(4);
  } else if (symbol === 'WBTC') {
    return price.toFixed(2);
  } else if (symbol === 'ETH') {
    return price.toFixed(2);
  } else {
    return price.toFixed(4);
  }
}

// Utility function to format price change
export function formatPriceChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

// Token interface for historical price data
interface Token {
  chainId: number;
  address: string;
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  isNative?: boolean;
}

// Hook for fetching historical price data from DEX subgraph
export function useHistoricalPriceData(tokenA: Token | null, tokenB: Token | null) {
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairAddress, setPairAddress] = useState<string | null>(null);

  console.log('🔍 useHistoricalPriceData called with:', {
    tokenA: tokenA?.symbol,
    tokenB: tokenB?.symbol,
    tokenAAddress: tokenA?.address,
    tokenBAddress: tokenB?.address,
    timestamp: new Date().toISOString()
  });

  // Safely get publicClient - will be null if not in Wagmi context
  let publicClient: any = null;
  try {
    publicClient = usePublicClient();
  } catch (e) {
    // Not in Wagmi context
    console.log('Not in Wagmi context');
  }

  // Check if we have valid tokens
  const hasValidTokens = tokenA && tokenB && tokenA.address !== tokenB.address;

  // Get pair address dynamically from factory contract (like Uniswap)
  useEffect(() => {
    const fetchPairAddress = async () => {
      if (!hasValidTokens) {
        setPairAddress(null);
        return;
      }

      if (!publicClient) {
        console.log('⚠️ No publicClient available');
        setPairAddress(null);
        return;
      }

      try {
        // Use factory contract to get pair address dynamically
        const address = await getPairAddress(publicClient, tokenA!, tokenB!);

        setPairAddress(address);
        console.log('🔍 Pair address resolved:', {
          tokenA: tokenA!.symbol,
          tokenB: tokenB!.symbol,
          pairAddress: address,
          exists: !!address
        });
      } catch (error) {
        console.error('Error getting pair address:', error);
        setPairAddress(null);
      }
    };

    fetchPairAddress();
  }, [tokenA, tokenB, hasValidTokens, publicClient]);

  const fetchHistoricalData = useCallback(async () => {
    console.log('🔍 fetchHistoricalData called with:', {
      tokenA: tokenA?.symbol,
      tokenB: tokenB?.symbol,
      pairAddress,
      hasValidTokens,
      timestamp: new Date().toISOString()
    });

    // If no valid tokens, show no data
    if (!hasValidTokens) {
      console.log('⚠️ No valid tokens');
      setPriceData([]);
      setError('Invalid token pair');
      setIsLoading(false);
      return;
    }

    // If no pair exists, show no data (like Uniswap)
    if (!pairAddress) {
      console.log('⚠️ No pair exists for this token combination');
      setPriceData([]);
      setError('No liquidity pool exists for this token pair');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching historical price data directly from subgraph...');

      // Import the direct subgraph functions
      const { getPairDayData, getPairData } = await import('@/lib/subgraph-client');

      // Fetch data directly from subgraph
      const [dayData, pairData] = await Promise.all([
        getPairDayData(pairAddress.toLowerCase(), 30, 0),
        getPairData(pairAddress.toLowerCase())
      ]);

      console.log('📊 Direct subgraph response:', {
        dayDataLength: dayData?.length || 0,
        pairData: pairData ? { id: pairData.id, reserve0: pairData.reserve0, reserve1: pairData.reserve1 } : null,
        sampleDayData: dayData?.slice(0, 2)
      });

      if (dayData && pairData) {
        console.log('🔍 Raw subgraph data:', {
          dayDataLength: dayData.length,
          pairData: pairData ? { id: pairData.id, reserve0: pairData.reserve0, reserve1: pairData.reserve1 } : null,
          sampleDayData: dayData.slice(0, 2)
        });

        // Get current price from pair reserves
        let currentPrice = 0.0003; // Default fallback
        if (pairData && pairData.token0 && pairData.token1) {
          const reserve0 = parseFloat(pairData.reserve0);
          const reserve1 = parseFloat(pairData.reserve1);

          // Determine which token is which based on symbols
          const isToken0WKLC = pairData.token0.symbol === 'WKLC' || pairData.token0.symbol === 'KLC';
          const isToken1WKLC = pairData.token1.symbol === 'WKLC' || pairData.token1.symbol === 'KLC';

          if (isToken0WKLC && reserve0 > 0) {
            // WKLC is token0, price = reserve1 / reserve0
            currentPrice = reserve1 / reserve0;
          } else if (isToken1WKLC && reserve1 > 0) {
            // WKLC is token1, price = reserve0 / reserve1
            currentPrice = reserve0 / reserve1;
          }

          console.log('💰 Current price calculation:', {
            token0: pairData.token0.symbol,
            token1: pairData.token1.symbol,
            reserve0,
            reserve1,
            calculatedPrice: currentPrice
          });
        }

        if (dayData.length > 0) {
          // Convert subgraph data to OHLCV format - keep it simple like the working version
          const historicalData: PricePoint[] = dayData
            .map((day: any, index: number) => {
              const volume = parseFloat(day.dailyVolumeUSD || '0');

              // Use current price for most recent day, generate historical prices with variation
              let price = currentPrice;
              if (index < dayData.length - 1) {
                // Generate historical prices with some variation
                const daysAgo = dayData.length - 1 - index;
                const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
                price = currentPrice * (1 + variation * (daysAgo / dayData.length));
              }

              // Convert day ID to timestamp (day * 86400 seconds)
              const timestamp = day.date * 86400;

              return {
                time: timestamp,
                open: price * (0.98 + Math.random() * 0.04), // Random open within 2% of close
                high: price * (1.01 + Math.random() * 0.02), // High 1-3% above close
                low: price * (0.97 + Math.random() * 0.02),  // Low 1-3% below close
                close: price,
                volume: volume
              };
            })
            .sort((a: any, b: any) => (a.time as number) - (b.time as number)); // Sort by time ascending

          console.log(`✅ Processed ${historicalData.length} historical price points`);
          setPriceData(historicalData);
        } else {
          console.log('⚠️ No historical data available');
          setPriceData([]);
          setError('No historical data available for this pair');
        }
      } else {
        console.log('⚠️ No data returned from subgraph');
        setPriceData([]);
        setError('No data available for this pair');
      }
    } catch (err) {
      console.error('❌ Error fetching historical price data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch historical data');
      setPriceData([]);
    } finally {
      setIsLoading(false);
    }
  }, [tokenA, tokenB, pairAddress, hasValidTokens]);

  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  return {
    priceData,
    isLoading,
    error,
    refetch: fetchHistoricalData
  };
}

// Hook for fetching real-time DEX market stats from contracts
export function useDexMarketStats(): DexMarketStats {
  const [klcPrice, setKlcPrice] = useState<number | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
  const [volume24h, setVolume24h] = useState<number | null>(null);
  const [totalLiquidity, setTotalLiquidity] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Create provider instance
  const getProvider = useCallback(() => {
    try {
      // Try to use window.ethereum first (if available), then fallback to RPC
      if (typeof window !== 'undefined' && window.ethereum) {
        return new ethers.providers.Web3Provider(window.ethereum);
      }

      // Fallback to JsonRpcProvider with proper configuration for ethers v5
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL, {
        chainId: 3888,
        name: 'KalyChain'
      });

      return provider;
    } catch (err) {
      console.error('Failed to create provider:', err);
      return null;
    }
  }, []);

  // Fetch DEX data from direct subgraph
  const fetchDexData = useCallback(async () => {
    try {
      // Only show loading spinner on initial load, not on subsequent refreshes
      if (isInitialLoad) {
        setIsLoading(true);
      }
      setError(null);

      console.log('🔍 Fetching DEX market stats directly from subgraph...');

      // Use direct subgraph calls - order by txCount since reserveUSD is 0
      const [factoryData, pairsData, dayData] = await Promise.all([
        getFactoryData(),
        getPairsData(20, 'txCount', 'desc'), // Get more pairs and order by transaction count
        getKalyswapDayData(2, 0)
      ]);

      console.log('📊 Direct subgraph data:', { factoryData, pairsData, dayData });

      if (factoryData && pairsData) {
        const factory = factoryData;
        const pairs = pairsData || [];
        const dayDatas = dayData || [];

        // Calculate KLC price from WKLC/USDT pairs
        let calculatedKlcPrice = 0.0003; // Default fallback
        let totalLiquidityUsd = 0;

        if (pairs.length > 0) {
          // First, try to find the specific WKLC/USDT pair by address
          let wklcUsdtPair = pairs.find((pair: any) =>
            pair.id.toLowerCase() === '0x25fddaf836d12dc5e285823a644bb86e0b79c8e2'
          );

          // If not found by address, look for any WKLC/USDT pair
          if (!wklcUsdtPair) {
            wklcUsdtPair = pairs.find((pair: any) =>
              (pair.token0.symbol === 'WKLC' && (pair.token1.symbol === 'USDT' || pair.token1.symbol === 'USDt')) ||
              (pair.token1.symbol === 'WKLC' && (pair.token0.symbol === 'USDT' || pair.token0.symbol === 'USDt'))
            );
          }

          if (wklcUsdtPair) {
            const reserve0 = parseFloat(wklcUsdtPair.reserve0);
            const reserve1 = parseFloat(wklcUsdtPair.reserve1);

            if (wklcUsdtPair.token0.symbol === 'WKLC') {
              // WKLC is token0, USDT is token1
              calculatedKlcPrice = reserve1 / reserve0;
              console.log(`💰 KLC price from ${wklcUsdtPair.token0.symbol}/${wklcUsdtPair.token1.symbol}: $${calculatedKlcPrice.toFixed(6)} (${reserve1} USDT / ${reserve0} WKLC)`);
            } else if (wklcUsdtPair.token1.symbol === 'WKLC') {
              // USDT is token0, WKLC is token1
              calculatedKlcPrice = reserve0 / reserve1;
              console.log(`💰 KLC price from ${wklcUsdtPair.token0.symbol}/${wklcUsdtPair.token1.symbol}: $${calculatedKlcPrice.toFixed(6)} (${reserve0} USDT / ${reserve1} WKLC)`);
            }
          } else {
            console.log('⚠️ WKLC/USDT pair not found in top pairs, using fallback price');
          }

          // Calculate total liquidity manually since reserveUSD is 0
          totalLiquidityUsd = pairs.reduce((sum: number, pair: any) => {
            let pairLiquidityUsd = 0;

            // Calculate USD value based on token types
            const reserve0 = parseFloat(pair.reserve0 || '0');
            const reserve1 = parseFloat(pair.reserve1 || '0');

            // Calculate USD value more accurately
            if (pair.token0.symbol === 'USDT' || pair.token0.symbol === 'USDt') {
              // Token0 is USDT - total liquidity = USDT reserve + (other token reserve * other token price)
              const otherTokenValueUsd = pair.token1.symbol === 'WKLC' ? reserve1 * calculatedKlcPrice : 0;
              pairLiquidityUsd = reserve0 + otherTokenValueUsd;
            } else if (pair.token1.symbol === 'USDT' || pair.token1.symbol === 'USDt') {
              // Token1 is USDT - total liquidity = USDT reserve + (other token reserve * other token price)
              const otherTokenValueUsd = pair.token0.symbol === 'WKLC' ? reserve0 * calculatedKlcPrice : 0;
              pairLiquidityUsd = reserve1 + otherTokenValueUsd;
            } else if (pair.token0.symbol === 'WKLC' && pair.token1.symbol === 'WKLC') {
              // Both tokens are WKLC (shouldn't happen, but just in case)
              pairLiquidityUsd = (reserve0 + reserve1) * calculatedKlcPrice;
            } else if (pair.token0.symbol === 'WKLC') {
              // Token0 is WKLC, token1 is unknown - only count WKLC value
              pairLiquidityUsd = reserve0 * calculatedKlcPrice;
            } else if (pair.token1.symbol === 'WKLC') {
              // Token1 is WKLC, token0 is unknown - only count WKLC value
              pairLiquidityUsd = reserve1 * calculatedKlcPrice;
            }

            console.log(`💰 Pair ${pair.token0.symbol}/${pair.token1.symbol}: $${pairLiquidityUsd.toLocaleString()} (${reserve0.toFixed(2)} ${pair.token0.symbol} + ${reserve1.toFixed(2)} ${pair.token1.symbol})`);
            return sum + pairLiquidityUsd;
          }, 0);

          console.log(`💰 Total calculated liquidity from pairs: $${totalLiquidityUsd.toLocaleString()}`);
        }

        // Calculate 24h volume and change
        let volume24h = 0; // Default to 0 instead of null to avoid N/A
        let priceChange24h = 2.5; // Default

        if (dayDatas.length >= 2) {
          const today = dayDatas[0];
          const yesterday = dayDatas[1];

          volume24h = parseFloat(today.dailyVolumeUSD || '0');
          console.log(`📊 24h Volume from subgraph: $${volume24h}`);

          // Calculate price change (simplified)
          if (yesterday.totalLiquidityUSD && today.totalLiquidityUSD) {
            const yesterdayLiquidity = parseFloat(yesterday.totalLiquidityUSD);
            const todayLiquidity = parseFloat(today.totalLiquidityUSD);
            priceChange24h = ((todayLiquidity - yesterdayLiquidity) / yesterdayLiquidity) * 100;
          }
        }

        // Use factory total liquidity if available and non-zero
        console.log(`🏭 Factory liquidity: ${factory?.totalLiquidityUSD || 'null'}`);
        if (factory?.totalLiquidityUSD && parseFloat(factory.totalLiquidityUSD) > 0) {
          console.log(`🏭 Using factory liquidity: $${parseFloat(factory.totalLiquidityUSD).toLocaleString()}`);
          totalLiquidityUsd = parseFloat(factory.totalLiquidityUSD);
        } else {
          console.log(`🏭 Factory liquidity is 0 or missing, using calculated sum: $${totalLiquidityUsd.toLocaleString()}`);
        }
        // Otherwise, use the sum from individual pairs (calculated above)

        // Set the calculated values
        setKlcPrice(calculatedKlcPrice);
        setTotalLiquidity(totalLiquidityUsd);
        setPriceChange24h(priceChange24h);
        setVolume24h(volume24h);

        console.log('✅ DEX stats updated:', {
          klcPrice: calculatedKlcPrice,
          totalLiquidity: totalLiquidityUsd,
          volume24h,
          priceChange24h
        });

      } else {
        throw new Error('Failed to fetch DEX stats from subgraph');
      }

    } catch (err) {
      console.error('❌ Error fetching DEX data from subgraph:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch DEX data');

      // Fallback to default values
      setKlcPrice(0.0003);
      setPriceChange24h(2.5);
      setVolume24h(null);
      setTotalLiquidity(null);
    } finally {
      // Only update loading state on initial load
      if (isInitialLoad) {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    }
  }, [isInitialLoad]);

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchDexData();

    // Update every 30 seconds
    const interval = setInterval(fetchDexData, 30000);

    return () => clearInterval(interval);
  }, [fetchDexData]);

  return {
    klcPrice,
    priceChange24h,
    volume24h,
    totalLiquidity,
    isLoading,
    error,
  };
}
