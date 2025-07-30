'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { getContract, formatUnits } from 'viem';
import { getContractAddress, DEFAULT_CHAIN_ID } from '@/config/contracts';
import { FACTORY_ABI, PAIR_ABI, ERC20_ABI } from '@/config/abis';
import { useUserPositions } from './useUserPositions';
import { usePools } from './usePools';

export interface PoolData {
  id: string;
  address: string;
  token0: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  token1: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  // Enhanced subgraph data
  reserveUSD?: string;
  volumeUSD?: string;
  txCount?: string;
  token0Price?: string;
  token1Price?: string;
  // User position data
  userHasPosition?: boolean;
  userLpBalance?: string;
  userPoolShare?: string;
  userToken0Amount?: string;
  userToken1Amount?: string;
}

export interface PoolDiscoveryState {
  pools: PoolData[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  sortBy: 'liquidity' | 'name';
  sortOrder: 'asc' | 'desc';
}

export function usePoolDiscovery() {
  const [state, setState] = useState<PoolDiscoveryState>({
    pools: [],
    loading: false,
    error: null,
    searchTerm: '',
    sortBy: 'liquidity',
    sortOrder: 'desc'
  });

  // Handle case where Wagmi providers aren't loaded yet
  let publicClient, address;
  try {
    publicClient = usePublicClient();
    const account = useAccount();
    address = account.address;
  } catch (error) {
    // Wagmi providers not available yet
    publicClient = null;
    address = undefined;
  }

  // Use enhanced pools hook with subgraph integration
  const { getAllPairs } = usePools();

  // Get pool addresses for user position tracking (memoized to prevent loops)
  const poolAddresses = useMemo(() => state.pools.map(pool => pool.address), [state.pools]);
  const { positions, getPosition } = useUserPositions(poolAddresses);

  // Fetch token information
  const getTokenInfo = useCallback(async (tokenAddress: string) => {
    if (!publicClient) return null;

    try {
      // Handle native KLC
      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        return {
          address: tokenAddress,
          symbol: 'KLC',
          name: 'KalyChain',
          decimals: 18
        };
      }

      const tokenContract = getContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        client: publicClient,
      });

      const [symbol, name, decimals] = await Promise.all([
        tokenContract.read.symbol([]),
        tokenContract.read.name([]),
        tokenContract.read.decimals([])
      ]);

      return {
        address: tokenAddress,
        symbol: symbol as string,
        name: name as string,
        decimals: decimals as number
      };
    } catch (error) {
      console.error(`Error fetching token info for ${tokenAddress}:`, error);
      return {
        address: tokenAddress,
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 18
      };
    }
  }, [publicClient]);

  // Fetch pool data for a specific pair
  const getPoolData = useCallback(async (pairAddress: string): Promise<PoolData | null> => {
    if (!publicClient) return null;

    try {
      const pairContract = getContract({
        address: pairAddress as `0x${string}`,
        abi: PAIR_ABI,
        client: publicClient,
      });

      // Get basic pair info
      const [reserves, totalSupply, token0Address, token1Address] = await Promise.all([
        pairContract.read.getReserves([]),
        pairContract.read.totalSupply([]),
        pairContract.read.token0([]),
        pairContract.read.token1([])
      ]);

      // Get token information
      const [token0Info, token1Info] = await Promise.all([
        getTokenInfo(token0Address as string),
        getTokenInfo(token1Address as string)
      ]);

      if (!token0Info || !token1Info) return null;

      // Format reserves and total supply
      const reservesArray = reserves as [bigint, bigint, number];
      const reserve0 = formatUnits(reservesArray[0], token0Info.decimals);
      const reserve1 = formatUnits(reservesArray[1], token1Info.decimals);
      const formattedTotalSupply = formatUnits(totalSupply as bigint, 18);

      return {
        id: pairAddress,
        address: pairAddress,
        token0: token0Info,
        token1: token1Info,
        reserve0,
        reserve1,
        totalSupply: formattedTotalSupply
      };
    } catch (error) {
      console.error(`Error fetching pool data for ${pairAddress}:`, error);
      return null;
    }
  }, [publicClient, getTokenInfo]);

  // Fetch all pools using subgraph (enhanced performance and data)
  const fetchPools = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log('📊 Fetching pools from DEX subgraph...');

      // Use subgraph-powered getAllPairs function
      const subgraphPairs = await getAllPairs();

      if (subgraphPairs && subgraphPairs.length > 0) {
        // Transform subgraph data to PoolData format
        const pools: PoolData[] = subgraphPairs.map((pair: any) => ({
          id: pair.id,
          address: pair.id,
          token0: {
            address: pair.token0.id,
            symbol: pair.token0.symbol,
            name: pair.token0.name,
            decimals: parseInt(pair.token0.decimals)
          },
          token1: {
            address: pair.token1.id,
            symbol: pair.token1.symbol,
            name: pair.token1.name,
            decimals: parseInt(pair.token1.decimals)
          },
          reserve0: pair.reserve0,
          reserve1: pair.reserve1,
          totalSupply: pair.totalSupply,
          // Enhanced subgraph data
          reserveUSD: pair.reserveUSD,
          volumeUSD: pair.volumeUSD,
          txCount: pair.txCount,
          token0Price: pair.token0Price,
          token1Price: pair.token1Price
        }));

        console.log(`✅ Successfully loaded ${pools.length} pools from subgraph`);

        setState(prev => ({
          ...prev,
          pools,
          loading: false
        }));
      } else {
        // Fallback to contract calls if subgraph fails
        console.log('⚠️ No subgraph data available, falling back to contract calls...');
        await fetchPoolsFromContract();
      }
    } catch (error) {
      console.error('❌ Error fetching pools from subgraph:', error);
      // Fallback to contract calls
      console.log('⚠️ Subgraph failed, falling back to contract calls...');
      await fetchPoolsFromContract();
    }
  }, [getAllPairs]);

  // Fallback function for contract calls
  const fetchPoolsFromContract = useCallback(async () => {
    if (!publicClient) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Wallet connection required'
      }));
      return;
    }

    try {
      const factoryAddress = getContractAddress('FACTORY', DEFAULT_CHAIN_ID);
      const factoryContract = getContract({
        address: factoryAddress as `0x${string}`,
        abi: FACTORY_ABI,
        client: publicClient,
      });

      // Get total number of pairs
      const allPairsLength = await factoryContract.read.allPairsLength([]);
      const totalPairs = Number(allPairsLength);

      console.log(`📊 Found ${totalPairs} total pairs in factory (contract fallback)`);

      // Limit to first 20 pairs for performance
      const pools: PoolData[] = [];
      const maxPairs = Math.min(totalPairs, 21);

      for (let i = 0; i < maxPairs; i++) {
        try {
          const pairAddress = await factoryContract.read.allPairs([BigInt(i)]);
          const poolData = await getPoolData(pairAddress as string);
          if (poolData) {
            pools.push(poolData);
          }
        } catch (err) {
          console.warn(`Failed to fetch pool ${i}:`, err);
        }
      }

      console.log(`✅ Successfully loaded ${pools.length} pools from contracts`);

      setState(prev => ({
        ...prev,
        pools,
        loading: false
      }));
    } catch (error) {
      console.error('❌ Error fetching pools from contracts:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: `Failed to fetch pools: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  }, [publicClient, getPoolData]);

  // Filter and sort pools with user position data
  const filteredAndSortedPools = useCallback(() => {
    let filtered = state.pools.map(pool => {
      // Add user position data to each pool
      const userPosition = getPosition(pool.address);

      // Calculate user's token amounts if they have a position
      let userToken0Amount = '0';
      let userToken1Amount = '0';

      if (userPosition?.hasPosition && userPosition.lpTokenBalance && pool.totalSupply) {
        const userLpBalance = parseFloat(userPosition.lpTokenBalance);
        const totalSupply = parseFloat(pool.totalSupply);
        const reserve0 = parseFloat(pool.reserve0);
        const reserve1 = parseFloat(pool.reserve1);

        if (totalSupply > 0) {
          const userShare = userLpBalance / totalSupply;
          userToken0Amount = (reserve0 * userShare).toFixed(6);
          userToken1Amount = (reserve1 * userShare).toFixed(6);
        }
      }

      return {
        ...pool,
        userHasPosition: userPosition?.hasPosition || false,
        userLpBalance: userPosition?.lpTokenBalance || '0',
        userPoolShare: userPosition?.poolShare || '0',
        userToken0Amount,
        userToken1Amount
      };
    });

    // Apply search filter
    if (state.searchTerm) {
      const searchLower = state.searchTerm.toLowerCase();
      filtered = filtered.filter(pool =>
        pool.token0.symbol.toLowerCase().includes(searchLower) ||
        pool.token1.symbol.toLowerCase().includes(searchLower) ||
        pool.token0.name.toLowerCase().includes(searchLower) ||
        pool.token1.name.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      // Prioritize pools where user has positions
      if (a.userHasPosition && !b.userHasPosition) return -1;
      if (!a.userHasPosition && b.userHasPosition) return 1;

      let aValue: number | string, bValue: number | string;

      switch (state.sortBy) {
        case 'liquidity':
          // Sort by total supply as a proxy for liquidity
          aValue = parseFloat(a.totalSupply);
          bValue = parseFloat(b.totalSupply);
          break;
        case 'name':
          // Sort alphabetically by token pair name
          aValue = `${a.token0.symbol}/${a.token1.symbol}`;
          bValue = `${b.token0.symbol}/${b.token1.symbol}`;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return state.sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        const numA = aValue as number;
        const numB = bValue as number;
        return state.sortOrder === 'asc' ? numA - numB : numB - numA;
      }
    });

    return filtered;
  }, [state.pools, state.searchTerm, state.sortBy, state.sortOrder, getPosition]);

  // Update search term
  const setSearchTerm = useCallback((term: string) => {
    setState(prev => ({ ...prev, searchTerm: term }));
  }, []);

  // Update sorting
  const setSorting = useCallback((sortBy: 'liquidity' | 'name', sortOrder: 'asc' | 'desc') => {
    setState(prev => ({ ...prev, sortBy, sortOrder }));
  }, []);

  // Load pools when publicClient becomes available
  useEffect(() => {
    if (publicClient) {
      fetchPools();
    }
  }, [fetchPools, publicClient]);

  return {
    pools: filteredAndSortedPools(),
    allPools: state.pools,
    loading: state.loading,
    error: state.error,
    searchTerm: state.searchTerm,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    setSearchTerm,
    setSorting,
    refetch: fetchPools
  };
}
