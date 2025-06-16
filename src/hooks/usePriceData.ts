'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

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

  // Generate mock data for demonstration
  const generateMockPriceData = useCallback((baseToken: string, quoteToken: string): PricePoint[] => {
    const data: PricePoint[] = [];
    const now = Math.floor(Date.now() / 1000);
    const basePrice = baseToken === 'KLC' ? 0.0003 : 1.0;
    
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
  }, []);

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

// Hook for getting current token price (simpler version)
export function useTokenPrice(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock price data for different tokens
    const mockPrices: Record<string, { price: number; change: number }> = {
      'KLC': { price: 0.0003, change: 2.5 },
      'wKLC': { price: 0.0003, change: 2.5 },
      'USDt': { price: 1.0, change: 0.1 },
      'USDC': { price: 1.0, change: -0.05 },
      'DAI': { price: 1.0, change: 0.02 },
      'WBTC': { price: 43250.0, change: 1.8 },
      'ETH': { price: 2650.0, change: 3.2 },
      'BNB': { price: 315.0, change: -1.2 },
      'POL': { price: 0.45, change: 4.1 },
      'KSWAP': { price: 0.15, change: 8.7 },
    };

    const tokenData = mockPrices[symbol] || { price: 1.0, change: 0 };
    
    // Simulate loading delay
    setTimeout(() => {
      setPrice(tokenData.price);
      setChange24h(tokenData.change);
      setIsLoading(false);
    }, 300);

    // Set up price updates
    const interval = setInterval(() => {
      const variation = 0.99 + Math.random() * 0.02; // ±1% variation
      setPrice(prev => prev ? prev * variation : tokenData.price);
    }, 10000); // Update every 10 seconds

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

// Hook for fetching real-time DEX market stats from contracts
export function useDexMarketStats(): DexMarketStats {
  const [klcPrice, setKlcPrice] = useState<number | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
  const [volume24h, setVolume24h] = useState<number | null>(null);
  const [totalLiquidity, setTotalLiquidity] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch DEX data from contracts
  const fetchDexData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const provider = getProvider();
      if (!provider) {
        throw new Error('Failed to create provider instance');
      }

      // Test the connection
      try {
        await provider.getNetwork();
      } catch (networkError) {
        console.error('Network connection failed:', networkError);
        throw new Error(`RPC connection failed: ${networkError instanceof Error ? networkError.message : 'Unknown error'}`);
      }

      // Create contract instances
      const pairContract = new ethers.Contract(DEX_CONTRACTS.WKLC_USDT_PAIR, pairABI, provider);
      const wklcContract = new ethers.Contract(DEX_CONTRACTS.WKLC, erc20ABI, provider);
      const usdtContract = new ethers.Contract(DEX_CONTRACTS.USDT, erc20ABI, provider);

      // Get pair reserves
      const reserves = await pairContract.getReserves();
      const [reserve0, reserve1] = reserves;

      // Get token addresses to determine which is which
      const token0 = await pairContract.token0();

      // Determine which reserve is WKLC and which is USDT
      let wklcReserve, usdtReserve;
      if (token0.toLowerCase() === DEX_CONTRACTS.WKLC.toLowerCase()) {
        wklcReserve = reserve0;
        usdtReserve = reserve1;
      } else {
        wklcReserve = reserve1;
        usdtReserve = reserve0;
      }

      // Get token decimals
      const wklcDecimals = await wklcContract.decimals();
      const usdtDecimals = await usdtContract.decimals();

      // Convert reserves to human readable format
      const wklcReserveFormatted = parseFloat(ethers.utils.formatUnits(wklcReserve, wklcDecimals));
      const usdtReserveFormatted = parseFloat(ethers.utils.formatUnits(usdtReserve, usdtDecimals));

      // Calculate KLC price in USDT
      const calculatedKlcPrice = usdtReserveFormatted / wklcReserveFormatted;

      // Calculate total liquidity (in USD)
      const liquidityUsd = usdtReserveFormatted * 2; // Multiply by 2 since it's 50/50 pool

      // Set the calculated values
      setKlcPrice(calculatedKlcPrice);
      setTotalLiquidity(liquidityUsd);

      // For now, set mock values for 24h change and volume
      // TODO: Implement historical price tracking for real 24h change
      setPriceChange24h(2.5); // Mock value - will be replaced with real data
      setVolume24h(null); // Set to null to show "N/A" until we implement real volume tracking

    } catch (err) {
      console.error('Error fetching DEX data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch DEX data');
    } finally {
      setIsLoading(false);
    }
  }, [getProvider]);

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
