'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPairMarketStats } from '@/lib/subgraph-client';
import { usePriceDataContext } from '@/contexts/PriceDataContext';
import { fetchGraphQL, safeApiCall, isNetworkError } from '@/utils/networkUtils';

interface Token {
  address: string;
  symbol: string;
  decimals: number;
  chainId?: number;
  isNative?: boolean;
}

interface PairMarketStats {
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  pairAddress: string | null;
  isLoading: boolean;
  error: string | null;
}

// WKLC address for native KLC conversion
const WKLC_ADDRESS = '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3';

/**
 * Hook to get market stats for a specific trading pair
 */
export function usePairMarketStats(tokenA?: Token, tokenB?: Token): PairMarketStats {
  const [price, setPrice] = useState<number>(0);
  const [volume24h, setVolume24h] = useState<number>(0);
  const [liquidity, setLiquidity] = useState<number>(0);
  const [pairAddress, setPairAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Use shared price change from context
  const { priceChange24h } = usePriceDataContext();

  // Convert native KLC to WKLC address
  const getTokenAddress = useCallback((token: Token): string => {
    if (token.isNative || token.address === '0x0000000000000000000000000000000000000000') {
      return WKLC_ADDRESS;
    }
    return token.address;
  }, []);

  // Dynamic pair lookup - no hardcoding!
  const findPairAddress = useCallback(async (tokenA: Token, tokenB: Token): Promise<string> => {
    const addressA = getTokenAddress(tokenA).toLowerCase();
    const addressB = getTokenAddress(tokenB).toLowerCase();

    console.log(`🔍 Looking for pair: ${tokenA.symbol}/${tokenB.symbol} (${addressA}/${addressB})`);

    try {
      // Get all pairs and find the one that matches our tokens
      const { getPairsData } = await import('@/lib/subgraph-client');
      const pairs = await getPairsData(100, 'txCount', 'desc'); // Get many pairs to ensure we find it

      const matchingPair = pairs.find((pair: any) => {
        const token0Addr = pair.token0.id.toLowerCase();
        const token1Addr = pair.token1.id.toLowerCase();

        return (token0Addr === addressA && token1Addr === addressB) ||
               (token0Addr === addressB && token1Addr === addressA);
      });

      if (matchingPair) {
        console.log(`✅ Found pair: ${tokenA.symbol}/${tokenB.symbol} at ${matchingPair.id}`);
        return matchingPair.id;
      }

      console.log(`❌ No pair found for ${tokenA.symbol}/${tokenB.symbol}`);
      return '';
    } catch (error) {
      console.error('Error finding pair:', error);
      return '';
    }
  }, [getTokenAddress]);

  const fetchPairStats = useCallback(async () => {
    if (!tokenA || !tokenB) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const foundPairAddress = await findPairAddress(tokenA, tokenB);

      if (!foundPairAddress) {
        console.log(`⚠️ No pair found for ${tokenA.symbol}/${tokenB.symbol} - this is normal for tokens without liquidity`);
        setIsLoading(false);
        return; // Exit gracefully instead of throwing error
      }

      setPairAddress(foundPairAddress);

      // Determine chainId from tokens for multichain support
      const chainId = tokenA.chainId || tokenB.chainId || 3888;

      console.log(`📊 Fetching pair stats for ${tokenA.symbol}/${tokenB.symbol} on chain ${chainId} (${foundPairAddress})`);

      const stats = await getPairMarketStats(foundPairAddress, chainId);

      if (!stats) {
        throw new Error('Failed to fetch pair stats');
      }

      // Get real 24hr volume using the same method as admin panel
      let real24hrVolume = 0;

      // Get KLC price from DEX data instead of CoinGecko
      let klcPriceUSD = 0.0003; // Default fallback price

      try {
        // Calculate KLC price from WKLC/USDT pair reserves
        const reserve0 = parseFloat(stats.pair.reserve0);
        const reserve1 = parseFloat(stats.pair.reserve1);

        if (reserve0 > 0 && reserve1 > 0) {
          // Check if this is the WKLC/USDT pair we can use for KLC pricing
          const isWklcUsdtPair = (stats.pair.token0.symbol === 'WKLC' && stats.pair.token1.symbol === 'USDT') ||
                                 (stats.pair.token0.symbol === 'USDT' && stats.pair.token1.symbol === 'WKLC');

          if (isWklcUsdtPair) {
            // Calculate KLC price from this pair's reserves
            if (stats.pair.token0.symbol === 'WKLC') {
              klcPriceUSD = reserve1 / reserve0; // USDT per WKLC
            } else {
              klcPriceUSD = reserve0 / reserve1; // USDT per WKLC
            }
            console.log(`📊 Using KLC price from DEX reserves: $${klcPriceUSD.toFixed(6)}`);
          }
        }

        // Sanity check for reasonable KLC price range
        if (klcPriceUSD < 0.0001 || klcPriceUSD > 0.01) {
          console.warn(`KLC price ${klcPriceUSD} outside reasonable range, using fallback`);
          klcPriceUSD = 0.0003;
        }

      } catch (priceError) {
        console.warn('Failed to calculate KLC price from DEX, using fallback:', priceError);
        klcPriceUSD = 0.0003; // Use fallback price
      }

      // Now try to get volume data with the KLC price (fallback or real)
      try {

        // Query the backend for real 24hr volume using the same method as admin
        // Use the actual token symbols from the pair data, not the input tokens
        const token0Symbol = stats.pair.token0.symbol;
        const token1Symbol = stats.pair.token1.symbol;

        console.log(`🔍 Using pair token symbols: ${token0Symbol}/${token1Symbol} for volume calculation`);

        // Backend GraphQL call with proper error handling
        const volumeData = await fetchGraphQL<any>(
          'http://localhost:3000/api/graphql',
          `
            query GetPairVolume($pairs: [PairInput!]!, $klcPriceUSD: Float!) {
              multiplePairs24hrVolume(pairs: $pairs, klcPriceUSD: $klcPriceUSD) {
                pairAddress
                token0Symbol
                token1Symbol
                volume24hrUSD
                swapCount
              }
            }
          `,
          {
            pairs: [{
              address: foundPairAddress.toLowerCase(),
              token0Symbol: token0Symbol,
              token1Symbol: token1Symbol
            }],
            klcPriceUSD: klcPriceUSD
          },
          { timeout: 8000, retries: 1 }
        );

        const pairVolumeData = volumeData?.multiplePairs24hrVolume?.[0];

        if (pairVolumeData) {
          real24hrVolume = parseFloat(pairVolumeData.volume24hrUSD) || 0;
          console.log(`✅ Real 24hr volume for ${tokenA.symbol}/${tokenB.symbol}: $${real24hrVolume.toFixed(2)}`);
        }
      } catch (volumeError) {
        console.error('Failed to fetch real 24hr volume:', volumeError);

        // Handle network errors gracefully
        if (isNetworkError(volumeError)) {
          console.warn('Network error fetching volume, using fallback');
        }

        // Fallback to subgraph volume if available
        real24hrVolume = stats.volume24h || 0;
      }

      // Calculate price from reserves
      const reserve0 = parseFloat(stats.pair.reserve0);
      const reserve1 = parseFloat(stats.pair.reserve1);

      let calculatedPrice = 0;
      if (reserve0 > 0 && reserve1 > 0) {
        // Determine which token is which
        const token0Address = getTokenAddress(tokenA);
        const token1Address = getTokenAddress(tokenB);

        if (stats.pair.token0.id.toLowerCase() === token0Address.toLowerCase()) {
          // tokenA is token0, tokenB is token1
          calculatedPrice = reserve1 / reserve0; // tokenB per tokenA
        } else {
          // tokenA is token1, tokenB is token0
          calculatedPrice = reserve0 / reserve1; // tokenB per tokenA
        }
      }

      setPrice(calculatedPrice);

      // Price change is now handled by the shared context from TradingChart
      // No need to calculate it here anymore
      setVolume24h(real24hrVolume); // Use real 24hr volume instead of subgraph volume

      // Calculate liquidity manually since reserveUSD might be 0
      let calculatedLiquidity = 0;

      // Find which reserve corresponds to stablecoins (USDT, USDC, DAI)
      const stablecoins = ['USDT', 'USDC', 'DAI'];
      let stablecoinReserve = 0;

      if (stablecoins.includes(stats.pair.token0.symbol)) {
        // token0 is the stablecoin
        stablecoinReserve = reserve0;
        calculatedLiquidity = stablecoinReserve * 2;
      } else if (stablecoins.includes(stats.pair.token1.symbol)) {
        // token1 is the stablecoin
        stablecoinReserve = reserve1;
        calculatedLiquidity = stablecoinReserve * 2;
      } else {
        // No stablecoin found, use reserveUSD or try to calculate based on known prices
        calculatedLiquidity = parseFloat(stats.pair.reserveUSD || '0');

        // If reserveUSD is 0 or not available, try to calculate using known token prices
        if (calculatedLiquidity === 0) {
          // For now, we'll show 'N/A' for non-stablecoin pairs without proper USD pricing
          // TODO: Implement price calculation using token price feeds or routing through stablecoin pairs
          calculatedLiquidity = 0;
        }
      }
      
      setLiquidity(calculatedLiquidity);

      console.log(`✅ Pair stats updated for ${tokenA.symbol}/${tokenB.symbol}:`, {
        price: calculatedPrice,
        priceChange24h: stats.priceChange24h,
        volume24h: stats.volume24h,
        liquidity: calculatedLiquidity
      });

    } catch (err) {
      console.error('❌ Error fetching pair stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pair stats');
      
      // Reset to default values
      setPrice(0);
      setVolume24h(0);
      setLiquidity(0);
    } finally {
      setIsLoading(false);
    }
  }, [tokenA, tokenB, findPairAddress, getTokenAddress]);

  // Fetch stats when tokens change
  useEffect(() => {
    fetchPairStats();
  }, [fetchPairStats]);

  return {
    price,
    priceChange24h,
    volume24h,
    liquidity,
    pairAddress,
    isLoading,
    error
  };
}
