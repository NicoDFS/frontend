'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits, getContract } from 'viem';
import { ERC20_ABI } from '@/config/abis';

interface Token {
  address: string;
  decimals: number;
  symbol: string;
  isNative?: boolean;
}

export function useTokenBalance(token: Token | null) {
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get wagmi hooks (must be called at top level)
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!token || !address || !isConnected || !publicClient) {
      setBalance('0');
      return;
    }

    const fetchBalance = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (token.isNative) {
          // Get native KLC balance with timeout
          const nativeBalance = await Promise.race([
            publicClient.getBalance({ address }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Balance fetch timeout')), 5000)
            )
          ]) as bigint;
          setBalance(formatUnits(nativeBalance, 18));
        } else {
          // Get ERC20 token balance with timeout
          const tokenContract = getContract({
            address: token.address as `0x${string}`,
            abi: ERC20_ABI,
            client: publicClient,
          });

          const tokenBalance = await Promise.race([
            tokenContract.read.balanceOf([address]),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Balance fetch timeout')), 5000)
            )
          ]) as bigint;
          setBalance(formatUnits(tokenBalance, token.decimals));
        }
      } catch (err) {
        console.error('Error fetching token balance:', err);
        // Don't show error for timeouts, just keep previous balance
        if (err instanceof Error && err.message.includes('timeout')) {
          console.warn('Balance fetch timed out, keeping previous balance');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch balance');
          setBalance('0');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();

    // Set up polling for balance updates (reduced frequency to avoid RPC overload)
    const interval = setInterval(fetchBalance, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [token, address, isConnected, publicClient]);

  return {
    balance,
    isLoading,
    error,
    formattedBalance: parseFloat(balance).toFixed(6)
  };
}

export function useTokenBalances(tokens: (Token | null)[]) {
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true); // Start with loading state
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track if this is the first load
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Get wagmi hooks (must be called at top level)
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  // Cache duration: 5 seconds
  const CACHE_DURATION = 5000;

  // Create a ref to store the fetch function to avoid dependency issues
  const fetchBalancesRef = React.useRef<((force?: boolean) => Promise<void>) | null>(null);
  const tokensRef = React.useRef(tokens);

  // Update tokens ref when tokens change
  React.useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  // useEffect to define and manage the fetchBalances function
  useEffect(() => {
    if (!address || !isConnected || !publicClient || tokensRef.current.length === 0) {
      setBalances({});
      setIsLoading(false);
      return;
    }

    const fetchBalances = async (force = false, isInitial = false) => {
      // Check cache unless forced
      const now = Date.now();
      if (!force && now - lastFetchTime < CACHE_DURATION && Object.keys(balances).length > 0) {
        return;
      }

      try {
        // Only show loading spinner on initial load or forced refresh, not during background polling
        if (isInitial || force) {
          setIsLoading(true);
        }
        setError(null);

        const balancePromises = tokensRef.current.map(async (token) => {
          if (!token) return null;

          try {
            // Check if token is native KLC (zero address or isNative flag)
            const isNativeToken = token.isNative ||
                                 token.address === '0x0000000000000000000000000000000000000000' ||
                                 token.address.toLowerCase() === '0x0000000000000000000000000000000000000000';

            if (isNativeToken) {
              const nativeBalance = await Promise.race([
                publicClient.getBalance({ address }),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Balance fetch timeout')), 5000)
                )
              ]) as bigint;
              return {
                symbol: token.symbol,
                balance: formatUnits(nativeBalance, 18)
              };
            } else {
              const tokenContract = getContract({
                address: token.address as `0x${string}`,
                abi: ERC20_ABI,
                client: publicClient,
              });

              const tokenBalance = await Promise.race([
                tokenContract.read.balanceOf([address]),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Balance fetch timeout')), 5000)
                )
              ]) as bigint;
              return {
                symbol: token.symbol,
                balance: formatUnits(tokenBalance, token.decimals)
              };
            }
          } catch (err) {
            // Don't log timeout errors as they're expected with slow RPC
            if (!(err instanceof Error && err.message.includes('timeout'))) {
              console.error(`Error fetching balance for ${token.symbol}:`, err);
            }
            return {
              symbol: token.symbol,
              balance: '0'
            };
          }
        });

        const results = await Promise.all(balancePromises);
        const balanceMap: Record<string, string> = {};

        results.forEach((result) => {
          if (result) {
            balanceMap[result.symbol] = result.balance;
          }
        });

        setBalances(balanceMap);
        setLastFetchTime(Date.now());

        // Mark initial load as complete
        if (isInitialLoad) {
          setIsInitialLoad(false);
        }
      } catch (err) {
        console.error('Error fetching token balances:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      } finally {
        // Only set loading to false if we were showing loading (initial load or forced refresh)
        if (isInitial || force) {
          setIsLoading(false);
        }
      }
    };

    // Store the function in ref so it can be called by refreshBalances
    fetchBalancesRef.current = (force = false) => fetchBalances(force, false);

    // Initial fetch (mark as initial load)
    fetchBalances(true, true);

    // Set up polling (background updates, no loading spinner) - reduced frequency
    const interval = setInterval(() => fetchBalances(false, false), 30000);

    return () => clearInterval(interval);
  }, [address, isConnected, publicClient]);

  return {
    balances,
    isLoading: isLoading && isInitialLoad, // Only show loading during initial load
    error,
    getBalance: (symbol: string) => balances[symbol] || '0',
    getFormattedBalance: (symbol: string) => parseFloat(balances[symbol] || '0').toFixed(6),
    refreshBalances: () => fetchBalancesRef.current?.(true)
  };
}
