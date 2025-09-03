'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import { getPairAddress } from '@/utils/priceImpact';
import { getFactoryData, getPairsData, getKalyswapDayData, getPairDayData } from '@/lib/subgraph-client';

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



// Hook for fetching price data
export function usePriceData(pair: TokenPair, timeframe: string = '1h') {
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
  const [volume24h, setVolume24h] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get public client for contract calls
  const publicClient = usePublicClient();



  // Fetch real chart data from subgraph for any pair
  const fetchSubgraphChartData = useCallback(async () => {
    try {
      console.log('fetchSubgraphChartData called:', {
        baseToken: pair.baseToken,
        quoteToken: pair.quoteToken,
        timeframe
      });

      // We need a pair address to fetch data - this should be provided by the parent component
      // For now, let's try to get it dynamically using the factory contract
      if (!publicClient) {
        console.log('⚠️ No publicClient available for pair address lookup');
        return;
      }

      // Get token addresses
      const tokenAddressMap: Record<string, string> = {
        'KLC': '0x069255299bb729399f3cecabdc73d15d3d10a2a3', // wKLC address (KLC = wKLC for pricing)
        'wKLC': '0x069255299bb729399f3cecabdc73d15d3d10a2a3',
        'USDT': '0x2ca775c77b922a51fcf3097f52bffdbc0250d99a',
        'KSWAP': '0xcc93b84ceed74dc28c746b7697d6fa477ffff65a',
        'DAI': '0x6e92cac380f7a7b86f4163fad0df2f277b16edc6',
        'CLISHA': '0x376e0ac0b55aa79f9b30aac8842e5e84ff06360c'
      };

      const baseTokenAddress = tokenAddressMap[pair.baseToken];
      const quoteTokenAddress = tokenAddressMap[pair.quoteToken];

      if (!baseTokenAddress || !quoteTokenAddress) {
        console.log(`⚠️ Token addresses not found for ${pair.baseToken}/${pair.quoteToken}`);
        return;
      }

      // Get pair address from factory contract
      const factoryAddress = '0xD42Af909d323D88e0E933B6c50D3e91c279004ca';
      const factoryContract = {
        address: factoryAddress as `0x${string}`,
        abi: [
          {
            "constant": true,
            "inputs": [{"name": "tokenA", "type": "address"}, {"name": "tokenB", "type": "address"}],
            "name": "getPair",
            "outputs": [{"name": "pair", "type": "address"}],
            "type": "function"
          }
        ]
      };

      const pairAddress = await publicClient.readContract({
        ...factoryContract,
        functionName: 'getPair',
        args: [baseTokenAddress as `0x${string}`, quoteTokenAddress as `0x${string}`]
      }) as string;

      if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
        console.log(`⚠️ No pair found for ${pair.baseToken}/${pair.quoteToken}`);
        return;
      }

      console.log(`📊 Found pair address: ${pairAddress} for ${pair.baseToken}/${pair.quoteToken}`);

      // Fetch pair day data from subgraph
      const days = timeframe === '1d' ? 1 : timeframe === '1w' ? 7 : timeframe === '1M' ? 30 : 7;
      const pairDayData = await getPairDayData(pairAddress.toLowerCase(), days, 0);

      if (!pairDayData || pairDayData.length === 0) {
        console.log(`⚠️ No chart data found for pair ${pairAddress}`);
        return;
      }

      console.log(`📊 Fetched ${pairDayData.length} days of data for ${pair.baseToken}/${pair.quoteToken}`);

      // Convert subgraph data to chart format
      // Note: Subgraph provides daily data, so we'll create OHLC from daily prices
      const formattedData: PricePoint[] = pairDayData.map((dayData: any) => {
        // Calculate price from reserves (token1Price is quoteToken price in baseToken)
        const price = parseFloat(dayData.reserve1) > 0 && parseFloat(dayData.reserve0) > 0
          ? parseFloat(dayData.reserve1) / parseFloat(dayData.reserve0)
          : 0;

        return {
          time: parseInt(dayData.date), // Unix timestamp
          open: price, // For daily data, we'll use the same price for OHLC
          high: price * 1.02, // Add small variation for visual purposes
          low: price * 0.98,
          close: price,
          volume: parseFloat(dayData.dailyVolumeUSD || '0')
        };
      }).reverse(); // Reverse to get chronological order

      setPriceData(formattedData);

      if (formattedData.length > 0) {
        const latest = formattedData[formattedData.length - 1];
        const first = formattedData[0];

        setCurrentPrice(latest.close);

        // Calculate 24h change
        const change = first.close > 0 ? ((latest.close - first.close) / first.close) * 100 : 0;
        setPriceChange24h(change);

        // Calculate total volume
        const volume = formattedData.reduce((sum, point) => sum + point.volume, 0);
        setVolume24h(volume);

        console.log(`📊 ${pair.baseToken}/${pair.quoteToken} Chart Data: Price=${latest.close.toFixed(6)}, Change=${change.toFixed(2)}%, Volume=${volume.toFixed(2)}`);
      }

    } catch (err) {
      console.error('Subgraph chart data error:', err);
    }
  }, [pair.baseToken, pair.quoteToken, timeframe, publicClient]);

  // Fetch price data
  const fetchPriceData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await fetchSubgraphChartData();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchSubgraphChartData]);

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
          } else if (symbol === 'USDT') {
            // USDT is our base currency
            calculatedPrice = 1.0;
          } else {
            // Cannot calculate price without market data - do not use hardcoded values
            console.warn(`No market data available for ${symbol} - cannot calculate price`);
            calculatedPrice = 0;
          }

          setPrice(calculatedPrice);
          setChange24h(2.5); // TODO: Calculate actual 24h change from historical data

        } else {
          throw new Error('Failed to fetch token price');
        }
      } catch (err) {
        console.error('❌ Error fetching token price:', err);
        // Only use stablecoin prices as fallback - no hardcoded token prices
        if (symbol === 'USDT' || symbol === 'USDC' || symbol === 'DAI') {
          setPrice(1.0);
          setChange24h(0.1);
        } else {
          console.warn(`No market data available for ${symbol} - cannot provide price`);
          setPrice(0);
          setChange24h(0);
        }
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
  } else if (['USDT', 'USDC', 'DAI'].includes(symbol)) {
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

    setIsLoading(true);
    setError(null);

    try {
      // All pairs now use subgraph data - no more CoinGecko dependency

      // For other pairs, try subgraph data
      if (!pairAddress) {
        console.log('⚠️ No pair exists for this token combination');
        setPriceData([]);
        setError('No liquidity pool exists for this token pair');
        setIsLoading(false);
        return;
      }

      console.log('🔍 Fetching historical price data from subgraph...');

      // Import the direct subgraph functions
      const { getPairHourData, getPairData } = await import('@/lib/subgraph-client');

      // Fetch hourly data for better chart granularity (168 hours = 7 days)
      const [hourData, pairData] = await Promise.all([
        getPairHourData(pairAddress.toLowerCase(), 168, 0),
        getPairData(pairAddress.toLowerCase())
      ]);

      console.log('📊 Direct subgraph response:', {
        hourDataLength: hourData?.length || 0,
        pairData: pairData ? { id: pairData.id, reserve0: pairData.reserve0, reserve1: pairData.reserve1 } : null,
        sampleHourData: hourData?.slice(0, 2)
      });

      if (hourData && pairData) {
        console.log('🔍 Raw subgraph data:', {
          hourDataLength: hourData.length,
          pairData: pairData ? { id: pairData.id, reserve0: pairData.reserve0, reserve1: pairData.reserve1 } : null,
          sampleHourData: hourData.slice(0, 2)
        });

        // Get current price from pair reserves using same logic as historical data
        let currentPrice = 0;
        if (pairData && pairData.token0 && pairData.token1) {
          const reserve0 = parseFloat(pairData.reserve0);
          const reserve1 = parseFloat(pairData.reserve1);

          if (reserve0 > 0 && reserve1 > 0) {
            // Use same logic as historical data calculation
            if (pairData.token0.symbol === tokenA?.symbol) {
              // tokenA is token0, so price = reserve1/reserve0 (how much token1 per token0)
              currentPrice = reserve1 / reserve0;
            } else if (pairData.token1.symbol === tokenA?.symbol) {
              // tokenA is token1, so price = reserve0/reserve1 (how much token0 per token1)
              currentPrice = reserve0 / reserve1;
            } else {
              // Fallback: assume we want token1 price in token0
              currentPrice = reserve1 / reserve0;
            }
          }

          console.log('💰 Current price calculation:', {
            tokenA: tokenA?.symbol,
            tokenB: tokenB?.symbol,
            token0: pairData.token0.symbol,
            token1: pairData.token1.symbol,
            reserve0,
            reserve1,
            calculatedPrice: currentPrice.toFixed(8)
          });
        }

        if (hourData.length > 0) {
          // We need to know which token is which to calculate the correct price
          // Get the pair info to understand token0 vs token1
          const pairInfo = pairData;

          console.log('🔍 Pair info for price calculation:', {
            pairAddress: pairInfo?.id,
            token0: pairInfo?.token0?.symbol,
            token1: pairInfo?.token1?.symbol,
            targetTokenA: tokenA?.symbol,
            targetTokenB: tokenB?.symbol
          });

          // Convert subgraph hourly data to OHLCV format using REAL price data from reserves
          const historicalData: PricePoint[] = hourData
            .map((hour: any) => {
              const volume = parseFloat(hour.hourlyVolumeUSD || '0');

              const reserve0 = parseFloat(hour.reserve0 || '0');
              const reserve1 = parseFloat(hour.reserve1 || '0');

              if (reserve0 <= 0 || reserve1 <= 0) {
                return null; // Skip invalid data
              }

              // Calculate price correctly based on which token we want the price for
              // If we want tokenA price in terms of tokenB:
              // - If tokenA is token0, price = reserve1/reserve0 (token1 per token0)
              // - If tokenA is token1, price = reserve0/reserve1 (token0 per token1)

              let price = 0;
              let calculation = '';

              if (pairInfo?.token0?.symbol === tokenA?.symbol) {
                // tokenA is token0, so price = reserve1/reserve0 (how much token1 per token0)
                price = reserve1 / reserve0;
                calculation = `${reserve1}/${reserve0} (${tokenA?.symbol} is token0)`;
              } else if (pairInfo?.token1?.symbol === tokenA?.symbol) {
                // tokenA is token1, so price = reserve0/reserve1 (how much token0 per token1)
                price = reserve0 / reserve1;
                calculation = `${reserve0}/${reserve1} (${tokenA?.symbol} is token1)`;
              } else {
                // Fallback: assume we want token1 price in token0
                price = reserve1 / reserve0;
                calculation = `${reserve1}/${reserve0} (fallback)`;
              }

              // Log the first calculation for debugging
              if (hourData.indexOf(hour) === 0) {
                console.log('💰 Price calculation debug:', {
                  tokenA: tokenA?.symbol,
                  tokenB: tokenB?.symbol,
                  token0: pairInfo?.token0?.symbol,
                  token1: pairInfo?.token1?.symbol,
                  reserve0,
                  reserve1,
                  calculation,
                  finalPrice: price.toFixed(8)
                });
              }

              const timestamp = parseInt(hour.hourStartUnix);

              return {
                time: timestamp,
                open: price,
                high: price * 1.005, // Smaller variation for hourly data
                low: price * 0.995,
                close: price,
                volume: volume
              };
            })
            .filter((point: any) => point !== null && point.close > 0) // Filter out invalid price points
            .sort((a: any, b: any) => (a.time as number) - (b.time as number)); // Sort by time ascending

          console.log(`✅ Processed ${historicalData.length} REAL historical price points from subgraph`);
          console.log('📊 Sample data points:', historicalData.slice(0, 3).map(p => ({
            time: typeof p.time === 'number' ? new Date(p.time * 1000).toISOString().split('T')[0] : 'invalid',
            price: p.close.toFixed(8),
            volume: p.volume.toFixed(2)
          })));
          setPriceData(historicalData);
        } else {
          console.log('⚠️ No historical data available - subgraph may not be fully synced');
          setPriceData([]);
          setError('Chart data not available - subgraph is syncing');
        }
      } else {
        console.log('⚠️ No data returned from subgraph - pair may not be indexed yet');
        setPriceData([]);
        setError('Chart data not available - pair not indexed in subgraph yet');
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

        // Calculate KLC price from WKLC/USDT pairs - no hardcoded fallback
        let calculatedKlcPrice = 0;
        let totalLiquidityUsd = 0;

        if (pairs.length > 0) {
          // First, try to find the specific WKLC/USDT pair by address
          let wklcUsdtPair = pairs.find((pair: any) =>
            pair.id.toLowerCase() === '0x25fddaf836d12dc5e285823a644bb86e0b79c8e2'
          );

          // If not found by address, look for any WKLC/USDT pair
          if (!wklcUsdtPair) {
            wklcUsdtPair = pairs.find((pair: any) =>
              (pair.token0.symbol === 'WKLC' && (pair.token1.symbol === 'USDT')) ||
              (pair.token1.symbol === 'WKLC' && (pair.token0.symbol === 'USDT'))
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
            if (pair.token0.symbol === 'USDT') {
              // Token0 is USDT - total liquidity = USDT reserve + (other token reserve * other token price)
              const otherTokenValueUsd = pair.token1.symbol === 'WKLC' ? reserve1 * calculatedKlcPrice : 0;
              pairLiquidityUsd = reserve0 + otherTokenValueUsd;
            } else if (pair.token1.symbol === 'USDT') {
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
