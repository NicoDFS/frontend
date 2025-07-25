'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPairMarketStats } from '@/lib/subgraph-client';
import { usePriceDataContext } from '@/contexts/PriceDataContext';

interface Token {
  address: string;
  symbol: string;
  decimals: number;
  isNative?: boolean;
}

interface PairMarketStats {
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
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

      const pairAddress = await findPairAddress(tokenA, tokenB);

      if (!pairAddress) {
        throw new Error(`No pair found for ${tokenA.symbol}/${tokenB.symbol}`);
      }

      console.log(`📊 Fetching pair stats for ${tokenA.symbol}/${tokenB.symbol} (${pairAddress})`);

      const stats = await getPairMarketStats(pairAddress);

      if (!stats) {
        throw new Error('Failed to fetch pair stats');
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
      setVolume24h(stats.volume24h);

      // Calculate liquidity manually since reserveUSD might be 0
      let calculatedLiquidity = 0;

      // Find which reserve corresponds to stablecoins (USDT, USDC, DAI)
      const stablecoins = ['USDT', 'USDt', 'USDC', 'DAI'];
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
    isLoading,
    error
  };
}
