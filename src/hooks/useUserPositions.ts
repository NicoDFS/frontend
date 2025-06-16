'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { getContract, formatUnits } from 'viem';
import { PAIR_ABI } from '@/config/abis';

export interface UserPosition {
  poolAddress: string;
  lpTokenBalance: string;
  lpTokenBalanceRaw: bigint;
  totalSupply: string;
  poolShare: string; // Percentage of pool owned
  token0Amount: string;
  token1Amount: string;
  hasPosition: boolean;
}

export function useUserPositions(poolAddresses: string[]) {
  const [positions, setPositions] = useState<Record<string, UserPosition>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize pool addresses to prevent loops
  const memoizedPoolAddresses = useMemo(() => poolAddresses, [poolAddresses.join(',')]);

  // Handle case where Wagmi providers aren't loaded yet
  let address, publicClient;
  try {
    const account = useAccount();
    address = account.address;
    publicClient = usePublicClient();
  } catch (error) {
    // Wagmi providers not available yet
    address = undefined;
    publicClient = null;
  }

  const fetchUserPosition = useCallback(async (poolAddress: string): Promise<UserPosition | null> => {
    if (!publicClient || !address) return null;

    try {
      const pairContract = getContract({
        address: poolAddress as `0x${string}`,
        abi: PAIR_ABI,
        client: publicClient,
      });

      // Get user's LP token balance and total supply
      const [lpTokenBalance, totalSupply, reserves] = await Promise.all([
        pairContract.read.balanceOf([address]),
        pairContract.read.totalSupply(),
        pairContract.read.getReserves()
      ]);

      const lpTokenBalanceFormatted = formatUnits(lpTokenBalance, 18);
      const totalSupplyFormatted = formatUnits(totalSupply, 18);

      // Calculate pool share percentage
      const poolShare = totalSupply > 0n
        ? ((Number(lpTokenBalance) / Number(totalSupply)) * 100).toFixed(4)
        : '0';

      // Calculate user's share of each token
      const userShare = totalSupply > 0n ? Number(lpTokenBalance) / Number(totalSupply) : 0;
      const token0Amount = (Number(formatUnits(reserves[0], 18)) * userShare).toFixed(6);
      const token1Amount = (Number(formatUnits(reserves[1], 18)) * userShare).toFixed(6);

      return {
        poolAddress,
        lpTokenBalance: lpTokenBalanceFormatted,
        lpTokenBalanceRaw: lpTokenBalance,
        totalSupply: totalSupplyFormatted,
        poolShare,
        token0Amount,
        token1Amount,
        hasPosition: lpTokenBalance > 0n
      };
    } catch (error) {
      return null;
    }
  }, [publicClient, address]);

  const fetchAllPositions = useCallback(async () => {
    if (!address || !publicClient || memoizedPoolAddresses.length === 0) {
      setPositions({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const positionPromises = memoizedPoolAddresses.map(poolAddress =>
        fetchUserPosition(poolAddress)
      );

      const positionResults = await Promise.all(positionPromises);

      const newPositions: Record<string, UserPosition> = {};

      positionResults.forEach((position, index) => {
        if (position) {
          newPositions[memoizedPoolAddresses[index]] = position;
        }
      });

      setPositions(newPositions);
    } catch (err) {
      setError(`Failed to fetch positions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [address, publicClient, memoizedPoolAddresses, fetchUserPosition]);

  // Fetch positions when dependencies change
  useEffect(() => {
    fetchAllPositions();
  }, [fetchAllPositions]);

  // Get position for a specific pool
  const getPosition = useCallback((poolAddress: string): UserPosition | null => {
    return positions[poolAddress] || null;
  }, [positions]);

  // Check if user has any positions
  const hasAnyPositions = useCallback((): boolean => {
    return Object.values(positions).some(position => position.hasPosition);
  }, [positions]);

  // Get all positions where user has liquidity
  const getUserPositions = useCallback((): UserPosition[] => {
    return Object.values(positions).filter(position => position.hasPosition);
  }, [positions]);

  return {
    positions,
    loading,
    error,
    getPosition,
    hasAnyPositions,
    getUserPositions,
    refetch: fetchAllPositions
  };
}
