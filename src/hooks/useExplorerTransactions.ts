import { useState, useEffect } from 'react';
import { decodeAbiParameters, parseAbiParameters } from 'viem';

// KalyScan API types
interface KalyScanTransaction {
  hash: string;
  timestamp: string;
  from: {
    hash: string;
    name?: string;
  };
  to: {
    hash: string;
    name?: string;
  };
  method: string;
  value: string;
  status: string;
  gas_used: string;
  fee: {
    value: string;
  };
  block_number: number;
  transaction_types: string[];
  raw_input: string;
}

interface KalyScanResponse {
  items: KalyScanTransaction[];
  next_page_params?: any;
}

// Simplified transaction interface for UI
export interface ExplorerTransaction {
  id: string;
  hash: string;
  timestamp: Date;
  from: string;
  type: 'TOKEN_SWAP' | 'KLC_SWAP' | 'UNKNOWN';
  klcValue?: string;
  status: 'success' | 'failed';
  gasUsed: string;
  blockNumber: number;
  tokenPair?: {
    token0: string;
    token1: string;
  };
}

interface UseExplorerTransactionsProps {
  userAddress?: string | null;
  limit?: number;
}

interface ExplorerTransactionsResult {
  transactions: ExplorerTransaction[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Router contract address
const ROUTER_ADDRESS = '0x183F288BF7EEBe1A3f318F4681dF4a70ef32B2f3';

// Method signatures for different swap types
const METHOD_SIGNATURES = {
  '0x38ed1739': 'TOKEN_SWAP', // swapExactTokensForTokens
  '0xb6124cc7': 'KLC_SWAP',   // swapExactKLCForTokens
  '0x18cbafe5': 'TOKEN_SWAP', // swapExactTokensForKLC
  '0x7ff36ab5': 'TOKEN_SWAP', // swapExactTokensForTokensSupportingFeeOnTransferTokens
} as const;

// Token address to symbol mapping - KalyChain tokens
const TOKEN_SYMBOLS: Record<string, string> = {
  // Native and Wrapped KLC
  '0x0000000000000000000000000000000000000000': 'KLC', // Native KLC
  '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3': 'wKLC', // Wrapped KLC
  '0x8A1ABbB167b149F2493C8141091028fD812Da6E4': 'KLC', // Bridge KLC

  // Stablecoins
  '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A': 'USDT', // Tether USD
  '0x9cAb0c396cF0F4325913f2269a0b72BD4d46E3A9': 'USDC', // USD Coin
  '0x6E92CAC380F7A7B86f4163fad0df2F277B16Edc6': 'DAI',  // Dai Stablecoin

  // Major Tokens
  '0xaA77D4a26d432B82DB07F8a47B7f7F623fd92455': 'WBTC', // Wrapped Bitcoin
  '0xfdbB253753dDE60b11211B169dC872AaE672879b': 'ETH',  // Ethereum
  '0x0e2318b62a096AC68ad2D7F37592CBf0cA9c4Ddb': 'BNB',  // Binance Coin
  '0x706C9a63d7c8b7Aaf85DDCca52654645f470E8Ac': 'POL',  // Polygon

  // Platform Token
  '0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a': 'KSWAP', // KalySwap Token
};

// Get token symbol from address
const getTokenSymbol = (address: string): string => {
  const normalizedAddress = address.toLowerCase();
  const symbol = TOKEN_SYMBOLS[normalizedAddress] || TOKEN_SYMBOLS[address];
  if (symbol) return symbol;

  // Return shortened address if symbol not found
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Decode swap transaction input data
const decodeSwapInput = (input: string, methodId: string): { token0: string; token1: string } | null => {
  try {
    if (methodId === '0x38ed1739') {
      // swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)
      const decoded = decodeAbiParameters(
        parseAbiParameters('uint256, uint256, address[], address, uint256'),
        `0x${input.slice(10)}` as `0x${string}`
      );
      const path = decoded[2] as string[];
      if (path.length >= 2) {
        return {
          token0: getTokenSymbol(path[0]),
          token1: getTokenSymbol(path[path.length - 1])
        };
      }
    } else if (methodId === '0xb6124cc7') {
      // swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)
      const decoded = decodeAbiParameters(
        parseAbiParameters('uint256, address[], address, uint256'),
        `0x${input.slice(10)}` as `0x${string}`
      );
      const path = decoded[1] as string[];
      if (path.length >= 2) {
        return {
          token0: 'KLC', // ETH/KLC swap always starts with native token
          token1: getTokenSymbol(path[path.length - 1])
        };
      }
    }
  } catch (error) {
    console.warn('Failed to decode swap input:', error);
  }
  return null;
};

export function useExplorerTransactions({
  userAddress,
  limit = 50
}: UseExplorerTransactionsProps): ExplorerTransactionsResult {
  const [transactions, setTransactions] = useState<ExplorerTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching transactions from KalyScan API...');
      
      // Fetch transactions from KalyScan API
      const response = await fetch(
        `https://kalyscan.io/api/v2/addresses/${ROUTER_ADDRESS}/transactions?filter=to%20%7C%20from&limit=${limit}`,
        {
          headers: {
            'accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`KalyScan API error: ${response.status}`);
      }

      const data: KalyScanResponse = await response.json();
      console.log(`Fetched ${data.items.length} transactions from KalyScan`);

      // Transform KalyScan data to our format
      const transformedTransactions: ExplorerTransaction[] = data.items
        .filter(tx => tx.to.hash.toLowerCase() === ROUTER_ADDRESS.toLowerCase()) // Only transactions TO the router
        .map(tx => {
          const tokenPair = tx.raw_input ? decodeSwapInput(tx.raw_input, tx.method) : null;
          return {
            id: tx.hash,
            hash: tx.hash,
            timestamp: new Date(tx.timestamp),
            from: tx.from.hash,
            type: getTransactionType(tx.method),
            klcValue: tx.value !== '0' ? tx.value : undefined,
            status: tx.status === 'ok' ? 'success' : 'failed',
            gasUsed: tx.gas_used,
            blockNumber: tx.block_number,
            tokenPair
          };
        });

      // Filter for user transactions if userAddress is provided
      const filteredTransactions = userAddress
        ? transformedTransactions.filter(tx => 
            tx.from.toLowerCase() === userAddress.toLowerCase()
          )
        : transformedTransactions;

      setTransactions(filteredTransactions);
      console.log(`Processed ${filteredTransactions.length} transactions`);

    } catch (err) {
      console.error('Error fetching explorer transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine transaction type from method signature
  const getTransactionType = (method: string): ExplorerTransaction['type'] => {
    return METHOD_SIGNATURES[method as keyof typeof METHOD_SIGNATURES] || 'UNKNOWN';
  };

  // Fetch transactions on mount and when dependencies change
  useEffect(() => {
    fetchTransactions();
  }, [userAddress, limit]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions
  };
}
