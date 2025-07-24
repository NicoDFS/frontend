'use client';

import { useState, useEffect, useCallback } from 'react';

// Types for farming subgraph data
export interface FarmingPool {
  id: string;
  address: string;
  stakingToken: string;
  rewardsToken: string;
  totalStaked: string;
  rewardRate: string;
  periodFinish: string;
  farmers?: Farmer[];
}

export interface Farmer {
  id: string;
  address: string;
  stakedAmount: string;
  rewards: string;
}

export interface WhitelistedPool {
  id: string;
  pairAddress: string;
  weight: string;
  stakingPool?: FarmingPool | null;
}

export interface FarmingData {
  farmingPools: FarmingPool[];
  whitelistedPools: WhitelistedPool[];
  userFarms: Farmer[];
}

// Hook for fetching farming data from subgraph
export function useFarmingSubgraph(userAddress?: string) {
  const [farmingData, setFarmingData] = useState<FarmingData>({
    farmingPools: [],
    whitelistedPools: [],
    userFarms: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFarmingData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Fetching farming data from subgraph...');

      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetFarmingData($userAddress: String) {
              farmingPools {
                id
                address
                stakingToken
                rewardsToken
                totalStaked
                rewardRate
                periodFinish
                farmers(where: { address: $userAddress }) {
                  id
                  address
                  stakedAmount
                  rewards
                }
              }
              whitelistedPools {
                id
                pairAddress
                weight
                stakingPool {
                  id
                  address
                  stakingToken
                  rewardsToken
                  totalStaked
                  rewardRate
                  periodFinish
                }
              }
            }
          `,
          variables: {
            userAddress: userAddress?.toLowerCase()
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📊 Farming subgraph response:', result);

        if (result.errors) {
          console.error('GraphQL errors:', result.errors);
          throw new Error(result.errors[0].message);
        }

        if (result.data) {
          const farmingPools = result.data.farmingPools || [];
          const whitelistedPools = result.data.whitelistedPools || [];
          
          // Extract user farms from all pools
          const userFarms: Farmer[] = [];
          farmingPools.forEach((pool: FarmingPool) => {
            if (pool.farmers && pool.farmers.length > 0) {
              userFarms.push(...pool.farmers);
            }
          });

          setFarmingData({
            farmingPools,
            whitelistedPools,
            userFarms
          });

          console.log(`✅ Fetched ${farmingPools.length} farming pools, ${whitelistedPools.length} whitelisted pools, ${userFarms.length} user farms`);
        }
      } else {
        throw new Error('Failed to fetch farming data from subgraph');
      }
    } catch (err) {
      console.error('❌ Error fetching farming data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch farming data');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchFarmingData();
  }, [fetchFarmingData]);

  // Get farming pool by staking token address
  const getFarmingPoolByStakingToken = useCallback((stakingToken: string): FarmingPool | null => {
    return farmingData.farmingPools.find(pool => 
      pool.stakingToken.toLowerCase() === stakingToken.toLowerCase()
    ) || null;
  }, [farmingData.farmingPools]);

  // Get user's staked amount in a specific pool
  const getUserStakedAmount = useCallback((poolAddress: string): string => {
    const userFarm = farmingData.userFarms.find(farm => 
      farm.id.includes(poolAddress.toLowerCase())
    );
    return userFarm?.stakedAmount || '0';
  }, [farmingData.userFarms]);

  // Get user's earned rewards in a specific pool
  const getUserEarnedRewards = useCallback((poolAddress: string): string => {
    const userFarm = farmingData.userFarms.find(farm => 
      farm.id.includes(poolAddress.toLowerCase())
    );
    return userFarm?.rewards || '0';
  }, [farmingData.userFarms]);

  // Check if a pair is whitelisted for farming
  const isPairWhitelisted = useCallback((pairAddress: string): boolean => {
    return farmingData.whitelistedPools.some(pool => 
      pool.pairAddress.toLowerCase() === pairAddress.toLowerCase()
    );
  }, [farmingData.whitelistedPools]);

  // Get whitelisted pool info
  const getWhitelistedPool = useCallback((pairAddress: string): WhitelistedPool | null => {
    return farmingData.whitelistedPools.find(pool => 
      pool.pairAddress.toLowerCase() === pairAddress.toLowerCase()
    ) || null;
  }, [farmingData.whitelistedPools]);

  return {
    farmingData,
    isLoading,
    error,
    refetch: fetchFarmingData,
    // Helper functions
    getFarmingPoolByStakingToken,
    getUserStakedAmount,
    getUserEarnedRewards,
    isPairWhitelisted,
    getWhitelistedPool,
    // Computed values
    totalFarmingPools: farmingData.farmingPools.length,
    totalWhitelistedPools: farmingData.whitelistedPools.length,
    userActiveFarms: farmingData.userFarms.filter(farm => parseFloat(farm.stakedAmount) > 0).length
  };
}

// Hook for fetching specific farming pool data
export function useFarmingPool(poolAddress: string, userAddress?: string) {
  const [pool, setPool] = useState<FarmingPool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPoolData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetFarmingPool($poolId: String!, $userAddress: String) {
              farmingPool(id: $poolId) {
                id
                address
                stakingToken
                rewardsToken
                totalStaked
                rewardRate
                periodFinish
                farmers(where: { address: $userAddress }) {
                  id
                  address
                  stakedAmount
                  rewards
                }
              }
            }
          `,
          variables: {
            poolId: poolAddress.toLowerCase(),
            userAddress: userAddress?.toLowerCase()
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.errors) {
          throw new Error(result.errors[0].message);
        }

        setPool(result.data?.farmingPool || null);
      } else {
        throw new Error('Failed to fetch farming pool data');
      }
    } catch (err) {
      console.error('❌ Error fetching farming pool:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch farming pool');
    } finally {
      setIsLoading(false);
    }
  }, [poolAddress, userAddress]);

  useEffect(() => {
    if (poolAddress) {
      fetchPoolData();
    }
  }, [fetchPoolData, poolAddress]);

  return {
    pool,
    isLoading,
    error,
    refetch: fetchPoolData,
    userStakedAmount: pool?.farmers?.[0]?.stakedAmount || '0',
    userEarnedRewards: pool?.farmers?.[0]?.rewards || '0'
  };
}
