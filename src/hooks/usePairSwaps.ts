import { useState, useEffect, useCallback } from 'react';
import { getPairSwaps, getRecentSwaps } from '@/lib/subgraph-client';
import { safeApiCall, isNetworkError } from '@/utils/networkUtils';

// Swap transaction interface
export interface SubgraphSwap {
  id: string;
  timestamp: string;
  transaction: {
    id: string;
    blockNumber: string;
  };
  pair: {
    id: string;
    token0: {
      id: string;
      symbol: string;
      decimals: string;
    };
    token1: {
      id: string;
      symbol: string;
      decimals: string;
    };
  };
  sender: string;
  from: string;
  to: string;
  amount0In: string;
  amount1In: string;
  amount0Out: string;
  amount1Out: string;
  amountUSD: string;
}

// Formatted swap for UI display
export interface FormattedSwap {
  id: string;
  hash: string;
  timestamp: Date;
  blockNumber: number;
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Amount: string;
  token1Amount: string;
  amountUSD: number;
  sender: string;
  from: string;
  to: string;
  type: 'BUY' | 'SELL';
}

interface UsePairSwapsProps {
  pairAddress?: string | null;
  limit?: number;
  userAddress?: string | null;
}

interface UsePairSwapsResult {
  swaps: FormattedSwap[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Helper function to determine swap type and format amounts
function formatSwap(swap: SubgraphSwap, userAddress?: string | null): FormattedSwap {
  const amount0In = parseFloat(swap.amount0In);
  const amount1In = parseFloat(swap.amount1In);
  const amount0Out = parseFloat(swap.amount0Out);
  const amount1Out = parseFloat(swap.amount1Out);

  // Determine swap direction based on which amounts are non-zero
  let type: 'BUY' | 'SELL' = 'BUY';
  let token0Amount = '';
  let token1Amount = '';

  if (amount0In > 0 && amount1Out > 0) {
    // Selling token0 for token1
    type = 'SELL';
    token0Amount = `-${amount0In.toFixed(6)}`;
    token1Amount = `+${amount1Out.toFixed(6)}`;
  } else if (amount1In > 0 && amount0Out > 0) {
    // Selling token1 for token0 (buying token0)
    type = 'BUY';
    token0Amount = `+${amount0Out.toFixed(6)}`;
    token1Amount = `-${amount1In.toFixed(6)}`;
  }

  return {
    id: swap.id,
    hash: swap.transaction.id,
    timestamp: new Date(parseInt(swap.timestamp) * 1000),
    blockNumber: parseInt(swap.transaction.blockNumber),
    pairAddress: swap.pair.id,
    token0Symbol: swap.pair.token0.symbol,
    token1Symbol: swap.pair.token1.symbol,
    token0Amount,
    token1Amount,
    amountUSD: parseFloat(swap.amountUSD),
    sender: swap.sender,
    from: swap.from,
    to: swap.to,
    type
  };
}

export function usePairSwaps({
  pairAddress,
  limit = 20,
  userAddress
}: UsePairSwapsProps): UsePairSwapsResult {
  const [swaps, setSwaps] = useState<FormattedSwap[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSwaps = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching swaps from subgraph...', { pairAddress, limit, userAddress });

      let rawSwaps: SubgraphSwap[] = [];

      if (pairAddress) {
        // Fetch swaps for specific pair with safe API call
        rawSwaps = await safeApiCall(
          () => getPairSwaps(pairAddress, limit),
          [],
          `Pair swaps for ${pairAddress}`
        );
        console.log(`✅ Fetched ${rawSwaps.length} swaps for pair ${pairAddress}`);
      } else {
        // Fetch recent swaps across all pairs with safe API call
        rawSwaps = await safeApiCall(
          () => getRecentSwaps(limit),
          [],
          'Recent swaps'
        );
        console.log(`✅ Fetched ${rawSwaps.length} recent swaps`);
      }

      // Format swaps for UI
      let formattedSwaps = rawSwaps.map(swap => formatSwap(swap, userAddress));

      // Filter by user address if provided
      if (userAddress) {
        const userAddressLower = userAddress.toLowerCase();
        formattedSwaps = formattedSwaps.filter(swap =>
          swap.from.toLowerCase() === userAddressLower ||
          swap.to.toLowerCase() === userAddressLower
        );
        console.log(`Filtered to ${formattedSwaps.length} swaps for user ${userAddress}`);
      }

      setSwaps(formattedSwaps);

    } catch (err) {
      console.error('Error fetching swaps from subgraph:', err);

      // Handle network errors gracefully
      if (isNetworkError(err)) {
        setError('Network connection issue. Please check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch swaps');
      }

      setSwaps([]);
    } finally {
      setLoading(false);
    }
  }, [pairAddress, limit, userAddress]);

  // Fetch swaps when dependencies change
  useEffect(() => {
    fetchSwaps();
  }, [fetchSwaps]);

  return {
    swaps,
    loading,
    error,
    refetch: fetchSwaps
  };
}
