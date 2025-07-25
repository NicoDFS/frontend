'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { DoubleSideStaking, DoubleSideStakingInfo, Token } from '@/types/farming'
import { BigNumber, ethers } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { useFarmingContracts } from './useFarmingContracts'
import { usePairAddresses } from './usePairAddresses'
import { LP_FARMING_POOLS, DOUBLE_SIDE_STAKING } from '@/config/farming'
import { batchFarmingCalls, createMulticallService } from '@/utils/multicall'
import { contractCache, CacheKeys } from '@/utils/contractCache'
import stakingRewardsABI from '@/config/abis/dex/stakingRewardsABI.json'
import { useFarmingSubgraph } from '@/hooks/useFarmingSubgraph'

// Mock TokenAmount implementation (same as original)
class MockTokenAmount {
  constructor(public token: Token, public raw: BigNumber) {}

  toSignificant(digits: number): string {
    try {
      const formatted = formatUnits(this.raw, this.token.decimals)
      const value = parseFloat(formatted)
      return value.toFixed(Math.min(digits, 6))
    } catch (error) {
      console.error('Error in toSignificant:', error)
      return '0'
    }
  }

  toFixed(digits: number): string {
    try {
      const formatted = formatUnits(this.raw, this.token.decimals)
      const value = parseFloat(formatted)
      return value.toFixed(digits)
    } catch (error) {
      console.error('Error in toFixed:', error)
      return '0'
    }
  }

  toNumber(): number {
    try {
      const formatted = formatUnits(this.raw, this.token.decimals)
      return parseFloat(formatted)
    } catch (error) {
      console.error('Error in toNumber:', error)
      return 0
    }
  }

  equalTo(other: string | MockTokenAmount): boolean {
    if (typeof other === 'string') {
      return this.raw.eq(BigNumber.from(other))
    }
    return this.raw.eq(other.raw)
  }

  greaterThan(other: string | MockTokenAmount): boolean {
    if (typeof other === 'string') {
      return this.raw.gt(BigNumber.from(other))
    }
    return this.raw.gt(other.raw)
  }

  lessThan(other: string | MockTokenAmount): boolean {
    if (typeof other === 'string') {
      return this.raw.lt(BigNumber.from(other))
    }
    return this.raw.lt(other.raw)
  }
}

interface UseFarmingDataOptimizedProps {
  pools?: DoubleSideStaking[]
}

export function useFarmingDataOptimized({ pools }: UseFarmingDataOptimizedProps = {}) {
  const { address, provider, chainId } = useWallet()
  const { getLiquidityPoolManagerContract, getPoolAPR } = useFarmingContracts()
  const { pairAddresses } = usePairAddresses()
  
  const [stakingInfos, setStakingInfos] = useState<DoubleSideStakingInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const hasInitiallyLoaded = useRef(false)
  const [useSubgraph, setUseSubgraph] = useState(true) // Flag to control subgraph usage

  // Get farming data from subgraph
  const {
    farmingData,
    isLoading: subgraphLoading,
    error: subgraphError,
    getFarmingPoolByStakingToken,
    getUserStakedAmount,
    getUserEarnedRewards
  } = useFarmingSubgraph(address)

  // Use LP_FARMING_POOLS if no pools provided, fallback to DOUBLE_SIDE_STAKING
  // Memoize to prevent array recreation on every render
  const farmingPools = useMemo(() => {
    if (pools) return pools
    return Object.values(LP_FARMING_POOLS).length > 0
      ? Object.values(LP_FARMING_POOLS)
      : Object.values(DOUBLE_SIDE_STAKING)
  }, [pools])

  // Create N/A staking info for pools without data
  const createNAStakingInfo = useCallback((pool: DoubleSideStaking, token0: Token, token1: Token, pairAddress: string): DoubleSideStakingInfo => {
    const lpToken: Token = {
      address: pairAddress,
      symbol: `${token0.symbol}-${token1.symbol}`,
      name: `${token0.name}-${token1.name} LP`,
      decimals: 18,
      chainId: chainId || 3888
    }

    const zeroAmount = new MockTokenAmount(lpToken, BigNumber.from(0))
    const zeroReward = new MockTokenAmount(
      { address: '0x4C4b968232a8603e2D1e53AB26E9a0319fA33ED3', symbol: 'KSWAP', name: 'KalySwap', decimals: 18, chainId: chainId || 3888 } as Token,
      BigNumber.from(0)
    )

    return {
      stakingRewardAddress: pool.stakingRewardAddress,
      tokens: [token0, token1],
      stakedAmount: zeroAmount,
      earnedAmount: zeroReward,
      totalStakedAmount: zeroAmount,
      totalRewardRate: zeroReward,
      totalStakedInWklc: zeroAmount,
      totalStakedInUsd: zeroAmount,
      totalRewardRatePerSecond: zeroReward,
      totalRewardRatePerWeek: zeroReward,
      rewardRatePerWeek: zeroReward,
      periodFinish: new Date(0),
      apr: 'N/A',
      multiplier: BigNumber.from(0),
      isPeriodFinished: true,
      pairAddress,
      swapFeeApr: 0,
      stakingApr: 0,
      combinedApr: 0
    }
  }, [chainId])

  // Helper function to create staking info from multicall results
  const createStakingInfoFromMulticall = useCallback(async (
    pool: DoubleSideStaking,
    token0: Token,
    token1: Token,
    pairAddress: string,
    liquidityManagerResults: any[],
    stakingResults: any[],
    baseIndex: number,
    stakingIndex: number,
    provider: any,
    getPoolAPR: any
  ): Promise<DoubleSideStakingInfo | null> => {
    try {
      // Extract results
      const isWhitelisted = liquidityManagerResults[baseIndex] || false;
      const totalStaked = liquidityManagerResults[baseIndex + 1] || BigNumber.from(0);
      const rewardRate = liquidityManagerResults[baseIndex + 2] || BigNumber.from(0);

      const stakingResult = stakingResults[stakingIndex];
      const periodFinish = stakingResult?.[0] || BigNumber.from(0);
      const stakedAmount = stakingResult?.[1] || BigNumber.from(0);
      const earnedAmount = stakingResult?.[2] || BigNumber.from(0);

      if (!isWhitelisted) {
        console.warn(`⚠️ Pool ${token0.symbol}-${token1.symbol} is not whitelisted`);
        return createNAStakingInfo(pool, token0, token1, pairAddress);
      }

      // Calculate APR
      const apr = await getPoolAPR(
        pool.stakingRewardAddress,
        pairAddress,
        rewardRate,
        totalStaked
      );

      const stakingInfo: DoubleSideStakingInfo = {
        stakingRewardAddress: pool.stakingRewardAddress,
        tokens: [token0, token1],
        stakedAmount: new MockTokenAmount(
          { ...token0, address: pairAddress } as Token,
          stakedAmount
        ),
        earnedAmount: new MockTokenAmount(
          { address: '0x4C4b968232a8603e2D1e53AB26E9a0319fA33ED3', symbol: 'KSWAP', name: 'KalySwap', decimals: 18, chainId: chainId || 3888 } as Token,
          earnedAmount
        ),
        totalStakedAmount: new MockTokenAmount(
          { ...token0, address: pairAddress } as Token,
          totalStaked
        ),
        totalRewardRate: new MockTokenAmount(
          { address: '0x4C4b968232a8603e2D1e53AB26E9a0319fA33ED3', symbol: 'KSWAP', name: 'KalySwap', decimals: 18, chainId: chainId || 3888 } as Token,
          rewardRate
        ),
        periodFinish: new Date(periodFinish.toNumber() * 1000),
        apr: apr,
        multiplier: '1',
        isPeriodFinished: periodFinish.toNumber() * 1000 < Date.now(),
        pairAddress
      };

      return stakingInfo;
    } catch (err) {
      console.error('Error creating staking info from multicall:', err);
      return createNAStakingInfo(pool, token0, token1, pairAddress);
    }
  }, [chainId, createNAStakingInfo])

  const fetchStakingDataOptimized = useCallback(async () => {
    // For testing: Allow subgraph data even without wallet connection
    const canUseSubgraph = useSubgraph && !subgraphLoading && !subgraphError && farmingData.farmingPools.length > 0

    if (!provider || !chainId) {
      if (canUseSubgraph) {
        console.log('🚀 Using subgraph data without wallet connection for testing!')

        // Convert subgraph data to the format expected by the UI
        const subgraphStakingInfos = farmingData.farmingPools.map((pool: any) => {
          // Find corresponding whitelisted pool for weight
          const whitelistedPool = farmingData.whitelistedPools.find((wp: any) =>
            wp.pair?.toLowerCase() === pool.stakingToken?.toLowerCase()
          );

          // Find user's staking data for this pool
          const userFarm = farmingData.userFarms.find((farm: any) =>
            farm.pool?.address?.toLowerCase() === pool.address?.toLowerCase()
          );

          // Get user staking amounts
          const userStakedAmount = userFarm ? BigNumber.from(userFarm.stakedAmount || '0') : BigNumber.from('0');
          const userEarnedAmount = userFarm ? BigNumber.from(userFarm.rewards || '0') : BigNumber.from('0');

          // Get token names from pair address mapping
          let token0Symbol = 'UNKNOWN', token1Symbol = 'UNKNOWN';
          const pairAddress = pool.stakingToken.toLowerCase();

          // Try to find matching pool configuration
          const matchingPool = Object.values(LP_FARMING_POOLS).find(farmPool => {
            return farmPool.pairAddress?.toLowerCase() === pairAddress ||
                   farmPool.stakingRewardAddress?.toLowerCase() === pool.address.toLowerCase();
          });

          if (matchingPool) {
            token0Symbol = matchingPool.tokens[0].symbol;
            token1Symbol = matchingPool.tokens[1].symbol;
            console.log(`✅ Found pool config for ${pairAddress}: ${token0Symbol}-${token1Symbol}`);
          } else {
            console.warn(`⚠️ No pool configuration found for ${pairAddress}, using fallback mappings`);
            // Fallback to hardcoded mappings for pools not in config
          if (pairAddress === '0x25fddaf836d12dc5e285823a644bb86e0b79c8e2') {
            token0Symbol = 'WKLC';
            token1Symbol = 'USDT';
          } else if (pairAddress === '0x0e520779287bb711c8e603cc85d532daa7c55372') {
            token0Symbol = 'KSWAP';
            token1Symbol = 'USDT';
          } else if (pairAddress === '0xf3e034650e1c2597a0af75012c1854247f271ee0') {
            // KSWAP-WKLC pool
            token0Symbol = 'KSWAP';
            token1Symbol = 'WKLC';
          } else if (pairAddress === '0x1a3d8b9fe0a77923a8330ffce485afd2b0b8be7e') {
            // WKLC-DAI pool
            token0Symbol = 'WKLC';
            token1Symbol = 'DAI';
          } else if (pairAddress === '0x558d7d1ef09ae32dbdfe25f5f9eea6767288b156') {
            // WKLC-POL pool
            token0Symbol = 'WKLC';
            token1Symbol = 'POL';
          } else if (pairAddress === '0x5df408ae7a3a83b9889e8e661a6c91a00b723fde') {
            // WKLC-BNB pool
            token0Symbol = 'WKLC';
            token1Symbol = 'BNB';
          } else if (pairAddress === '0x82a20edd4a6c076f5c2f9d244c80c5906aa88268') {
            // WKLC-ETH pool
            token0Symbol = 'WKLC';
            token1Symbol = 'ETH';
          } else if (pairAddress === '0x4d7f05b00d6bf67c1062bccc26e1ca1fc24ac0f0') {
            // WKLC-USDC pool
            token0Symbol = 'WKLC';
            token1Symbol = 'USDC';
          } else if (pairAddress === '0x6548735742fc5cccb2cde021246feb333ef46211') {
            // Very small pool
            token0Symbol = 'WKLC';
            token1Symbol = 'WBTC';
          }
          }

          // Create proper token objects
          const lpToken: Token = {
            address: pool.stakingToken,
            symbol: `${token0Symbol}-${token1Symbol}`,
            name: `${token0Symbol}-${token1Symbol} LP`,
            decimals: 18,
            chainId: 3888
          };

          const rewardToken: Token = {
            address: '0x4C4b968232a8603e2D1e53AB26E9a0319fA33ED3',
            symbol: 'KSWAP',
            name: 'KalySwap',
            decimals: 18,
            chainId: 3888
          };

          // Convert string values to BigNumber and create MockTokenAmount objects
          const totalStaked = BigNumber.from(pool.totalStaked || '0');
          const rewardRate = BigNumber.from(pool.rewardRate || '0');
          const periodFinish = BigNumber.from(pool.periodFinish || '0');

          // Calculate weekly reward rate (rewardRate is per second in wei)
          const secondsPerWeek = BigNumber.from(60 * 60 * 24 * 7);
          const rewardRatePerWeekWei = rewardRate.mul(secondsPerWeek);

          // Debug logging to see actual values
          console.log(`🔍 Pool ${pool.address}: totalStaked=${pool.totalStaked}, rewardRate=${pool.rewardRate}, weight=${whitelistedPool?.weight}`);
          console.log(`🎯 Token mapping for ${pairAddress}: ${token0Symbol}-${token1Symbol}`);

          const token0: Token = {
            address: '0x0000000000000000000000000000000000000000',
            symbol: token0Symbol,
            name: token0Symbol,
            decimals: 18,
            chainId: chainId || 3888
          };

          const token1: Token = {
            address: '0x0000000000000000000000000000000000000001',
            symbol: token1Symbol,
            name: token1Symbol,
            decimals: 18,
            chainId: chainId || 3888
          };

          // Debug the calculation
          console.log(`🧮 Reward calculation: rewardRate=${rewardRate.toString()}, rewardRatePerWeekWei=${rewardRatePerWeekWei.toString()}`);

          // userFarm is already declared above at line 235

          // Calculate user's reward rate per week if they have staked tokens
          let userRewardRatePerWeekWei = BigNumber.from('0');
          if (userStakedAmount.gt(0) && totalStaked.gt(0)) {
            // User's share of total rewards = (userStaked / totalStaked) * totalRewardRateWei
            userRewardRatePerWeekWei = rewardRatePerWeekWei.mul(userStakedAmount).div(totalStaked);
          }

          return {
            stakingRewardAddress: pool.address,
            tokens: [token0, token1], // Proper pair tokens
            stakedAmount: new MockTokenAmount(lpToken, userStakedAmount),
            earnedAmount: new MockTokenAmount(rewardToken, userEarnedAmount),
            totalStakedAmount: new MockTokenAmount(lpToken, totalStaked),
            totalStakedInWklc: new MockTokenAmount(lpToken, BigNumber.from('0')), // TODO: Calculate from DEX data
            totalStakedInUsd: new MockTokenAmount(lpToken, totalStaked), // Raw LP token amount - UI will format
            totalRewardRate: new MockTokenAmount(rewardToken, rewardRate),
            totalRewardRatePerSecond: new MockTokenAmount(rewardToken, rewardRate),
            totalRewardRatePerWeek: new MockTokenAmount(rewardToken, rewardRatePerWeekWei), // Use wei value so MockTokenAmount can convert properly
            rewardRatePerWeek: new MockTokenAmount(rewardToken, userRewardRatePerWeekWei), // Use wei value for MockTokenAmount
            periodFinish: new Date(periodFinish.toNumber() * 1000),
            apr: '0', // TODO: Calculate real APR from reward rate and staked amount
            multiplier: whitelistedPool?.weight ? BigNumber.from(whitelistedPool.weight) : BigNumber.from('1'),
            isPeriodFinished: periodFinish.toNumber() * 1000 < Date.now(),
            pairAddress: pool.stakingToken,
            swapFeeApr: 0,
            stakingApr: 0,
            combinedApr: 0
          };
        });

        setStakingInfos(subgraphStakingInfos);
        setIsLoading(false);
        console.log(`✅ Loaded ${subgraphStakingInfos.length} farms from subgraph without wallet!`);
        return;
      }

      console.log('⏸️ Provider or chainId not available, skipping fetch')
      return
    }

    try {
      if (!hasInitiallyLoaded.current) {
        setIsLoading(true)
      }

      // Try subgraph first if enabled
      if (useSubgraph) {
        // If subgraph is still loading, wait for it
        if (subgraphLoading) {
          console.log('⏳ Waiting for subgraph to load...');
          setIsLoading(true);
          return;
        }

        // If subgraph has data, use the same logic as the no-wallet case above
        if (!subgraphError && farmingData.farmingPools.length > 0) {
          console.log('🚀 Using subgraph data for farming with wallet connected!', {
            farmingPoolsCount: farmingData.farmingPools.length,
            whitelistedPoolsCount: farmingData.whitelistedPools.length
          });

          // Use the same subgraph processing logic as above (lines 228-383)
          // This will be handled by the no-wallet case above, so we can skip this
          console.log('✅ Subgraph data will be processed by the no-wallet case above');
          return;
        }

        // If subgraph failed or has no data, log and fallback
        if (subgraphError) {
          console.log('⚠️ Subgraph error, falling back to multicall:', subgraphError);
        } else {
          console.log('⚠️ Subgraph has no farming pools, falling back to multicall');
        }
      }

      // Fallback to multicall if subgraph is disabled or failed
      console.log('📞 Using multicall for farming data (subgraph not enabled or unavailable)...');

      console.log('🚀 Starting optimized farm data fetch with multicall (including whitelisting)...')
      const startTime = Date.now()

      // Check cache first - use stable cache key for general farm data
      const cacheKey = CacheKeys.farmingData(chainId || 3888)
      const cachedData = contractCache.get<DoubleSideStakingInfo[]>(cacheKey)
      
      if (cachedData) {
        console.log('📦 Using cached farming data')
        setStakingInfos(cachedData)
        hasInitiallyLoaded.current = true
        setIsLoading(false)
        setIsFetching(false)
        return
      }

      setIsFetching(true)

      try {
        // Prepare data for multicall
        const poolPairAddresses: string[] = []
        const poolPairMapping: { [key: number]: { pairAddress: string; resultIndex: number } } = {}
        let resultIndex = 0

        farmingPools.forEach((pool, poolIndex) => {
          const poolKey = `${pool.tokens[0].symbol}_${pool.tokens[1].symbol}`
          const pairAddress = pairAddresses[poolKey] || pool.pairAddress

          if (pairAddress && pairAddress !== 'N/A') {
            poolPairAddresses.push(pairAddress)
            poolPairMapping[poolIndex] = { pairAddress, resultIndex }
          }
        })

        console.log('📡 Executing multicall for all farms (including whitelisting checks)...')
        console.log('🔍 Checking whitelisting for pair addresses:', poolPairAddresses)

        const { liquidityManagerResults, stakingResults } = await batchFarmingCalls(
          provider,
          getLiquidityPoolManagerContract(),
          farmingPools,
          poolPairAddresses
        )

        console.log('✅ Multicall successful, got', liquidityManagerResults.length + stakingResults.length, 'results')

        // Process results
        const stakingInfoPromises = farmingPools.map(async (pool, poolIndex) => {
          try {
            const token0: Token = {
              address: pool.tokens[0].address,
              symbol: pool.tokens[0].symbol,
              name: pool.tokens[0].name,
              decimals: pool.tokens[0].decimals,
              chainId: chainId || 3888
            };

            const token1: Token = {
              address: pool.tokens[1].address,
              symbol: pool.tokens[1].symbol,
              name: pool.tokens[1].name,
              decimals: pool.tokens[1].decimals,
              chainId: chainId || 3888
            };

            const poolKey = `${token0.symbol}_${token1.symbol}`;
            const pairAddress = pairAddresses[poolKey] || pool.pairAddress;

            if (!pairAddress || pairAddress === 'N/A') {
              console.warn(`⚠️ No pair address found for ${poolKey}, creating N/A info`);
              return createNAStakingInfo(pool, token0, token1, 'N/A');
            }

            // Get multicall results for this pool
            const mapping = poolPairMapping[poolIndex];
            if (!mapping) {
              console.warn(`⚠️ No multicall mapping found for ${poolKey}`);
              return createNAStakingInfo(pool, token0, token1, pairAddress);
            }

            // Process multicall results to create staking info
            const baseIndex = mapping.resultIndex * 3; // 3 calls per pool for LiquidityManager
            const stakingIndex = mapping.resultIndex; // 1 call per pool for StakingRewards

            console.log(`🔍 Pool ${poolKey} multicall results:`, {
              poolIndex,
              resultIndex: mapping.resultIndex,
              baseIndex,
              pairAddress: mapping.pairAddress,
              liquidityManagerResults: liquidityManagerResults.slice(baseIndex, baseIndex + 3),
              stakingResult: stakingResults[stakingIndex]
            });

            // Create staking info from multicall results
            return await createStakingInfoFromMulticall(
              pool,
              token0,
              token1,
              pairAddress,
              liquidityManagerResults,
              stakingResults,
              baseIndex,
              stakingIndex,
              provider,
              getPoolAPR
            );
          } catch (err) {
            console.error(`❌ Error processing pool ${pool.tokens[0].symbol}-${pool.tokens[1].symbol}:`, err);
            return createNAStakingInfo(pool, pool.tokens[0], pool.tokens[1], 'N/A');
          }
        });

        const results = await Promise.all(stakingInfoPromises)
        const validResults = results.filter((result): result is DoubleSideStakingInfo => result !== null)

        console.log(`✅ Multicall completed: ${validResults.length} farms processed in ${Date.now() - startTime}ms`)
        contractCache.set(cacheKey, validResults, { ttl: 45 * 1000 })
        setStakingInfos(validResults)
        hasInitiallyLoaded.current = true
        return
      } catch (err) {
        console.error('❌ Error fetching farming data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch staking data')
      } finally {
        setIsLoading(false)
        setIsFetching(false)
      }
    } catch (err) {
      console.error('❌ Error in fetchStakingDataOptimized:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch staking data')
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [farmingPools, address, chainId, pairAddresses, refreshTrigger, provider, getLiquidityPoolManagerContract, getPoolAPR, createNAStakingInfo, useSubgraph, farmingData, subgraphLoading, subgraphError])

  useEffect(() => {
    fetchStakingDataOptimized()
  }, [farmingPools, address, chainId, pairAddresses, refreshTrigger, useSubgraph, farmingData, subgraphLoading])

  const refetch = useCallback(() => {
    console.log('🔄 Refetching farm data (clearing cache)...')
    // Clear cache and trigger refresh - use stable cache key
    const cacheKey = CacheKeys.farmingData(chainId || 3888)
    contractCache.delete(cacheKey)
    setError(null)
    setRefreshTrigger(prev => prev + 1)
  }, [chainId])

  return {
    stakingInfos,
    isLoading,
    error,
    refetch,
    // Subgraph status information
    subgraphEnabled: useSubgraph,
    subgraphLoading,
    subgraphError,
    toggleSubgraph: () => setUseSubgraph(!useSubgraph),
    farmingPoolsCount: farmingData.farmingPools.length
  }
}
