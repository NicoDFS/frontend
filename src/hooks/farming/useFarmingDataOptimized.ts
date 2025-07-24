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

  greaterThan(other: any): boolean {
    const otherValue = typeof other === 'string' ? BigNumber.from(other) : other.raw
    return this.raw.gt(otherValue)
  }

  lessThan(other: any): boolean {
    const otherValue = typeof other === 'string' ? BigNumber.from(other) : other.raw
    return this.raw.lt(otherValue)
  }

  equalTo(other: any): boolean {
    const otherValue = typeof other === 'string' ? BigNumber.from(other) : other.raw
    return this.raw.eq(otherValue)
  }
}

/**
 * Optimized farming data hook using multicall and caching
 * Reduces 80+ individual contract calls to 2-3 batched calls
 */
export function useFarmingDataOptimized(pools?: DoubleSideStaking[]) {
  const { address, chainId } = useWallet()
  const { pairAddresses } = usePairAddresses()
  const {
    getPoolAPR,
    getLiquidityPoolManagerContract,
    getStakingInfo
  } = useFarmingContracts()

  // Create provider for multicall
  const provider = useMemo(() => {
    return new ethers.providers.JsonRpcProvider('https://rpc.kalychain.io/rpc')
  }, [])

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

  // Create staking info from subgraph data
  const createStakingInfoFromSubgraph = useCallback((pool: any, token0: Token, token1: Token, pairAddress: string): DoubleSideStakingInfo | null => {
    try {
      // Get farming pool data from subgraph
      const farmingPool = getFarmingPoolByStakingToken(pairAddress);
      if (!farmingPool) {
        console.log(`No farming pool found in subgraph for ${pairAddress}`);
        return null;
      }

      console.log('📊 Creating staking info from subgraph data:', farmingPool);

      const lpToken: Token = {
        address: pairAddress,
        symbol: `${token0.symbol}-${token1.symbol}`,
        name: `${token0.name}-${token1.name} LP`,
        decimals: 18,
        chainId: chainId || 3888
      };

      const rewardToken: Token = {
        address: farmingPool.rewardsToken,
        symbol: 'KSWAP',
        name: 'KalySwap',
        decimals: 18,
        chainId: chainId || 3888
      };

      // Get user-specific data
      const userStakedAmount = getUserStakedAmount(farmingPool.address);
      const userEarnedRewards = getUserEarnedRewards(farmingPool.address);

      // Calculate period finish
      const periodFinish = new Date(parseInt(farmingPool.periodFinish) * 1000);
      const isPeriodFinished = periodFinish.getTime() < Date.now();

      // Create token amounts
      const stakedAmount = new MockTokenAmount(lpToken, BigNumber.from(userStakedAmount));
      const earnedAmount = new MockTokenAmount(rewardToken, BigNumber.from(userEarnedRewards));
      const totalStakedAmount = new MockTokenAmount(lpToken, BigNumber.from(farmingPool.totalStaked));
      const rewardRate = new MockTokenAmount(rewardToken, BigNumber.from(farmingPool.rewardRate));

      // Calculate weekly reward rate (rewardRate is per second)
      const weeklyRewardRate = new MockTokenAmount(
        rewardToken,
        BigNumber.from(farmingPool.rewardRate).mul(7 * 24 * 60 * 60) // seconds in a week
      );

      return {
        stakingRewardAddress: farmingPool.address,
        tokens: [token0, token1],
        multiplier: BigNumber.from(1), // Default multiplier
        stakedAmount,
        earnedAmount,
        totalStakedAmount,
        totalStakedInWklc: totalStakedAmount, // Simplified
        totalStakedInUsd: totalStakedAmount, // Simplified
        totalRewardRatePerSecond: rewardRate,
        totalRewardRatePerWeek: weeklyRewardRate,
        rewardRatePerWeek: weeklyRewardRate,
        periodFinish,
        isPeriodFinished,
        swapFeeApr: 0, // TODO: Calculate from DEX subgraph
        stakingApr: 0, // TODO: Calculate based on reward rate and total staked
        combinedApr: 0, // TODO: Calculate combined APR
        rewardTokensAddress: [farmingPool.rewardsToken],
        rewardsAddress: farmingPool.address,
        getHypotheticalWeeklyRewardRate: () => weeklyRewardRate
      };
    } catch (err) {
      console.error('❌ Error creating staking info from subgraph:', err);
      return null;
    }
  }, [chainId, getFarmingPoolByStakingToken, getUserStakedAmount, getUserEarnedRewards]);

  // Create N/A staking info for failed pools
  const createNAStakingInfo = useCallback((pool: any, token0: Token, token1: Token, pairAddress: string): DoubleSideStakingInfo => {
    const lpToken: Token = {
      address: pairAddress,
      symbol: `${token0.symbol}-${token1.symbol}`,
      name: `${token0.name}-${token1.name} LP`,
      decimals: 18,
      chainId: chainId || 3888
    }

    return {
      stakingRewardAddress: pool.stakingRewardAddress,
      tokens: [token0, token1],
      multiplier: BigNumber.from(0),
      stakedAmount: new MockTokenAmount(lpToken, BigNumber.from(0)),
      earnedAmount: new MockTokenAmount(token0, BigNumber.from(0)),
      totalStakedAmount: new MockTokenAmount(lpToken, BigNumber.from(0)),
      totalStakedInWklc: new MockTokenAmount(token0, BigNumber.from(0)),
      totalStakedInUsd: new MockTokenAmount(lpToken, BigNumber.from(0)),
      totalRewardRatePerSecond: new MockTokenAmount(token0, BigNumber.from(0)),
      totalRewardRatePerWeek: new MockTokenAmount(token0, BigNumber.from(0)),
      rewardRatePerWeek: new MockTokenAmount(token0, BigNumber.from(0)),
      periodFinish: new Date(),
      isPeriodFinished: true,
      swapFeeApr: 0,
      stakingApr: 0,
      combinedApr: 0,
      rewardTokensAddress: [],
      rewardsAddress: pool.stakingRewardAddress,
      getHypotheticalWeeklyRewardRate: () => new MockTokenAmount(token0, BigNumber.from(0))
    }
  }, [chainId])

  // Optimized data fetching with multicall
  const fetchStakingDataOptimized = useCallback(async () => {
    if (!farmingPools.length) {
      setStakingInfos([])
      setIsLoading(false)
      setIsFetching(false)
      return
    }

    if (isFetching) return

    try {
      setIsFetching(true)
      setError(null)

      // Only set loading on initial load
      if (!hasInitiallyLoaded.current) {
        setIsLoading(true)
      }

      // Try subgraph first if enabled and data is available
      if (useSubgraph && farmingData.farmingPools.length > 0 && !subgraphError) {
        console.log('🚀 Using subgraph data for farming pools...');

        const subgraphStakingInfos: DoubleSideStakingInfo[] = [];

        for (const pool of farmingPools) {
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

            if (!pairAddress) {
              console.warn(`No pair address found for ${poolKey}`);
              subgraphStakingInfos.push(createNAStakingInfo(pool, token0, token1, 'N/A'));
              continue;
            }

            // Try to create staking info from subgraph
            const stakingInfo = createStakingInfoFromSubgraph(pool, token0, token1, pairAddress);

            if (stakingInfo) {
              subgraphStakingInfos.push(stakingInfo);
              console.log(`✅ Created staking info from subgraph for ${poolKey}`);
            } else {
              // Fallback to N/A if subgraph data not available for this pool
              console.warn(`⚠️ No subgraph data for ${poolKey}, creating N/A info`);
              subgraphStakingInfos.push(createNAStakingInfo(pool, token0, token1, pairAddress));
            }
          } catch (err) {
            console.error(`❌ Error processing pool ${pool.tokens[0].symbol}-${pool.tokens[1].symbol}:`, err);
            subgraphStakingInfos.push(createNAStakingInfo(pool, pool.tokens[0], pool.tokens[1], 'N/A'));
          }
        }

        console.log(`✅ Subgraph processing complete: ${subgraphStakingInfos.length} pools processed`);
        setStakingInfos(subgraphStakingInfos);
        setIsLoading(false);
        setIsFetching(false);
        hasInitiallyLoaded.current = true;
        return;
      }

      // Fallback to contract calls if subgraph is disabled or failed
      console.log('⚠️ Falling back to contract calls for farming data...');

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

      // Get liquidity pool manager contract
      const liquidityPoolManagerContract = getLiquidityPoolManagerContract()
      if (!provider || !liquidityPoolManagerContract) {
        throw new Error('Provider or contracts not available')
      }

      // Prepare all staking contracts manually
      const stakingContracts = farmingPools.map(pool =>
        new ethers.Contract(pool.stakingRewardAddress, stakingRewardsABI, provider)
      )

      // Prepare pair addresses for whitelisting checks and create mapping
      const poolPairMapping: { [poolIndex: number]: { pairAddress: string; resultIndex: number } } = {}
      const poolPairAddresses: string[] = []

      farmingPools.forEach((pool, poolIndex) => {
        const token0 = pool.tokens[0]
        const token1 = pool.tokens[1]
        const poolKey = `${token0.symbol}_${token1.symbol}`
        const pairAddress = pairAddresses[poolKey] || pool.pairAddress

        if (pairAddress) {
          const resultIndex = poolPairAddresses.length
          poolPairAddresses.push(pairAddress)
          poolPairMapping[poolIndex] = { pairAddress, resultIndex }
        }
      })

      console.log('📡 Executing multicall for all farms (including whitelisting checks)...')
      console.log('🔍 Checking whitelisting for pair addresses:', poolPairAddresses)

      const { liquidityManagerResults, stakingResults } = await batchFarmingCalls(
        provider,
        liquidityPoolManagerContract,
        stakingContracts,
        poolPairAddresses,
        address,
        chainId || 3888
      )

      console.log('✅ Multicall completed, processing results...', {
        liquidityManagerResults: liquidityManagerResults?.length,
        stakingResults: stakingResults?.length,
        expectedPools: farmingPools.length
      })

      // Check if multicall failed - if so, fall back to individual calls
      const multicallFailed = !liquidityManagerResults || !stakingResults ||
        liquidityManagerResults.some(result => result === null) ||
        stakingResults.some(result => result === null || !result)

      if (multicallFailed) {
        console.warn('⚠️ Multicall failed, falling back to individual calls...')
        // Fall back to original approach using getStakingInfo for each pool
        const stakingInfoPromises = farmingPools.map(async (pool) => {
          try {
            const token0: Token = {
              address: pool.tokens[0].address,
              symbol: pool.tokens[0].symbol,
              name: pool.tokens[0].name,
              decimals: pool.tokens[0].decimals,
              chainId: chainId || 3888
            }

            const token1: Token = {
              address: pool.tokens[1].address,
              symbol: pool.tokens[1].symbol,
              name: pool.tokens[1].name,
              decimals: pool.tokens[1].decimals,
              chainId: chainId || 3888
            }

            const poolKey = `${token0.symbol}_${token1.symbol}`
            const pairAddress = pairAddresses[poolKey] || pool.pairAddress

            if (!pairAddress) {
              console.warn(`No pair address found for ${poolKey}`)
              return createNAStakingInfo(pool, token0, token1, 'N/A')
            }

            // Use individual contract calls (same as original hook)
            const contractData = await getStakingInfo(pairAddress, address)
            const aprData = await getPoolAPR(pairAddress)

            if (!contractData) {
              console.warn(`No contract data available for ${poolKey}`)
              return createNAStakingInfo(pool, token0, token1, pairAddress)
            }

            // Create LP token
            const lpToken: Token = {
              address: pairAddress,
              symbol: `${token0.symbol}-${token1.symbol}`,
              name: `${token0.name}-${token1.name} LP`,
              decimals: 18,
              chainId: chainId || 3888
            }

            // Create TokenAmounts with real contract data
            const stakedAmount = new MockTokenAmount(lpToken, contractData.stakedAmount)
            const earnedAmount = new MockTokenAmount(token0, contractData.earnedAmount)
            const totalStakedAmount = new MockTokenAmount(lpToken, contractData.totalStakedAmount)
            const totalRewardRatePerSecond = new MockTokenAmount(token0, contractData.rewardRate)
            const totalRewardRatePerWeek = new MockTokenAmount(token0, totalRewardRatePerSecond.raw.mul(604800))

            const userShareOfPool = contractData.totalStakedAmount.gt(0)
              ? contractData.stakedAmount.mul(BigNumber.from(10).pow(18)).div(contractData.totalStakedAmount)
              : BigNumber.from(0)
            const userWeeklyRewards = totalRewardRatePerWeek.raw.mul(userShareOfPool).div(BigNumber.from(10).pow(18))
            const rewardRatePerWeek = new MockTokenAmount(token0, userWeeklyRewards)

            const totalStakedInWklc = new MockTokenAmount(token0, contractData.klcLiquidity)
            const totalStakedInUsd = new MockTokenAmount(lpToken, contractData.totalStakedAmount)

            const stakingInfo: DoubleSideStakingInfo = {
              stakingRewardAddress: contractData.stakingContractAddress,
              tokens: [token0, token1],
              multiplier: contractData.poolWeight,
              stakedAmount,
              earnedAmount,
              totalStakedAmount,
              totalStakedInWklc,
              totalStakedInUsd,
              totalRewardRatePerSecond,
              totalRewardRatePerWeek,
              rewardRatePerWeek,
              periodFinish: new Date(contractData.periodFinish * 1000),
              isPeriodFinished: contractData.periodFinish < Math.floor(Date.now() / 1000),
              swapFeeApr: aprData?.swapFeeApr || 0,
              stakingApr: aprData?.stakingApr || 0,
              combinedApr: 0,
              rewardTokensAddress: [],
              rewardsAddress: pool.stakingRewardAddress,
              getHypotheticalWeeklyRewardRate: (stakedAmount, totalStakedAmount, totalRewardRatePerSecond) => {
                if (totalStakedAmount.equalTo('0')) return new MockTokenAmount(token0, BigNumber.from(0))
                const userShare = stakedAmount.raw.mul(BigNumber.from(10).pow(18)).div(totalStakedAmount.raw)
                const weeklyReward = totalRewardRatePerSecond.raw.mul(604800).mul(userShare).div(BigNumber.from(10).pow(18))
                return new MockTokenAmount(token0, weeklyReward)
              }
            }

            stakingInfo.combinedApr = (stakingInfo.swapFeeApr || 0) + (stakingInfo.stakingApr || 0)
            return stakingInfo

          } catch (poolError) {
            console.error(`Error fetching data for pool ${pool.stakingRewardAddress}:`, poolError)
            const token0: Token = {
              address: pool.tokens[0].address,
              symbol: pool.tokens[0].symbol,
              name: pool.tokens[0].name,
              decimals: pool.tokens[0].decimals,
              chainId: chainId || 3888
            }
            const token1: Token = {
              address: pool.tokens[1].address,
              symbol: pool.tokens[1].symbol,
              name: pool.tokens[1].name,
              decimals: pool.tokens[1].decimals,
              chainId: chainId || 3888
            }
            const poolKey = `${token0.symbol}_${token1.symbol}`
            const pairAddress = pairAddresses[poolKey] || pool.pairAddress
            return createNAStakingInfo(pool, token0, token1, pairAddress || 'N/A')
          }
        })

        const results = await Promise.all(stakingInfoPromises)
        const validResults = results.filter((result): result is DoubleSideStakingInfo => result !== null)

        console.log(`✅ Fallback completed: ${validResults.length} farms processed`)
        contractCache.set(cacheKey, validResults, { ttl: 45 * 1000 })
        setStakingInfos(validResults)
        hasInitiallyLoaded.current = true
        return
      }

      // Process results into staking infos
      const stakingInfoPromises = farmingPools.map(async (pool, index) => {
        try {
          // Create tokens
          const token0: Token = {
            address: pool.tokens[0].address,
            symbol: pool.tokens[0].symbol,
            name: pool.tokens[0].name,
            decimals: pool.tokens[0].decimals,
            chainId: chainId || 3888
          }

          const token1: Token = {
            address: pool.tokens[1].address,
            symbol: pool.tokens[1].symbol,
            name: pool.tokens[1].name,
            decimals: pool.tokens[1].decimals,
            chainId: chainId || 3888
          }

          // Get pair address
          const poolKey = `${token0.symbol}_${token1.symbol}`
          const pairAddress = pairAddresses[poolKey] || pool.pairAddress

          if (!pairAddress) {
            console.warn(`No pair address found for ${poolKey}`)
            return createNAStakingInfo(pool, token0, token1, 'N/A')
          }

          // Extract multicall results for this pool using the mapping
          const poolMapping = poolPairMapping[index]
          if (!poolMapping) {
            console.warn(`No pair mapping found for pool ${index}: ${token0.symbol}/${token1.symbol}`)
            return createNAStakingInfo(pool, token0, token1, pairAddress || 'N/A')
          }

          const baseIndex = poolMapping.resultIndex * 3 // 3 calls per pair
          const isWhitelisted = liquidityManagerResults[baseIndex]
          const weights = liquidityManagerResults[baseIndex + 1]
          const stakes = liquidityManagerResults[baseIndex + 2]
          // Note: klcLiquidity is handled separately due to failures on non-WKLC pairs

          console.log(`🔍 Pool ${token0.symbol}/${token1.symbol} multicall results:`, {
            poolIndex: index,
            resultIndex: poolMapping.resultIndex,
            baseIndex,
            pairAddress: poolMapping.pairAddress,
            isWhitelisted,
            weights: weights?.toString(),
            stakes,
            stakingRewardAddress: pool.stakingRewardAddress
          })

          // Skip non-whitelisted pools (this replaces the getWhitelistedPools() filtering)
          if (!isWhitelisted) {
            console.log(`⏭️ Skipping non-whitelisted pool: ${token0.symbol}/${token1.symbol}`)
            return null
          }

          // Extract staking contract results
          const stakingData = stakingResults[index]
          if (!stakingData || stakingData.length < 5) {
            console.warn(`Incomplete staking data for pool ${index}`)
            return createNAStakingInfo(pool, token0, token1, pairAddress)
          }

          const [totalSupply, rewardRate, periodFinish, balanceOf, earned] = stakingData

          // Get APR data (this can be cached separately)
          const aprData = await getPoolAPR(pairAddress)

          // Create LP token
          const lpToken: Token = {
            address: pairAddress,
            symbol: `${token0.symbol}-${token1.symbol}`,
            name: `${token0.name}-${token1.name} LP`,
            decimals: 18,
            chainId: chainId || 3888
          }

          // Create TokenAmounts
          const stakedAmount = new MockTokenAmount(lpToken, balanceOf || BigNumber.from(0))
          const earnedAmount = new MockTokenAmount(token0, earned || BigNumber.from(0))
          const totalStakedAmount = new MockTokenAmount(lpToken, totalSupply || BigNumber.from(0))
          const totalRewardRatePerSecond = new MockTokenAmount(token0, rewardRate || BigNumber.from(0))
          const totalRewardRatePerWeek = new MockTokenAmount(token0, (rewardRate || BigNumber.from(0)).mul(604800))

          // Calculate user's weekly reward rate
          const userShareOfPool = totalSupply && totalSupply.gt(0) && balanceOf
            ? balanceOf.mul(BigNumber.from(10).pow(18)).div(totalSupply)
            : BigNumber.from(0)
          const userWeeklyRewards = totalRewardRatePerWeek.raw.mul(userShareOfPool).div(BigNumber.from(10).pow(18))
          const rewardRatePerWeek = new MockTokenAmount(token0, userWeeklyRewards)

          // Set klcLiquidity to 0 for now (can be fetched individually later if needed)
          const klcLiquidity = BigNumber.from(0)
          const totalStakedInWklc = new MockTokenAmount(token0, klcLiquidity)
          const totalStakedInUsd = new MockTokenAmount(lpToken, totalSupply || BigNumber.from(0))

          const stakingInfo: DoubleSideStakingInfo = {
            stakingRewardAddress: pool.stakingRewardAddress,
            tokens: [token0, token1],
            multiplier: weights || BigNumber.from(0),
            stakedAmount,
            earnedAmount,
            totalStakedAmount,
            totalStakedInWklc,
            totalStakedInUsd,
            totalRewardRatePerSecond,
            totalRewardRatePerWeek,
            rewardRatePerWeek,
            periodFinish: new Date((periodFinish || 0) * 1000),
            isPeriodFinished: (periodFinish || 0) < Math.floor(Date.now() / 1000),
            swapFeeApr: aprData?.swapFeeApr || 0,
            stakingApr: aprData?.stakingApr || 0,
            combinedApr: (aprData?.swapFeeApr || 0) + (aprData?.stakingApr || 0),
            rewardTokensAddress: [],
            rewardsAddress: pool.stakingRewardAddress,
            getHypotheticalWeeklyRewardRate: (stakedAmount, totalStakedAmount, totalRewardRatePerSecond) => {
              if (totalStakedAmount.equalTo('0')) return new MockTokenAmount(token0, BigNumber.from(0))
              const userShare = stakedAmount.raw.mul(BigNumber.from(10).pow(18)).div(totalStakedAmount.raw)
              const weeklyReward = totalRewardRatePerSecond.raw.mul(604800).mul(userShare).div(BigNumber.from(10).pow(18))
              return new MockTokenAmount(token0, weeklyReward)
            }
          }

          return stakingInfo
        } catch (poolError) {
          console.error(`Error processing pool ${index}:`, poolError)
          const token0: Token = { address: pool.tokens[0].address, symbol: pool.tokens[0].symbol, name: pool.tokens[0].name, decimals: pool.tokens[0].decimals, chainId: chainId || 3888 }
          const token1: Token = { address: pool.tokens[1].address, symbol: pool.tokens[1].symbol, name: pool.tokens[1].name, decimals: pool.tokens[1].decimals, chainId: chainId || 3888 }
          const poolKey = `${token0.symbol}_${token1.symbol}`
          const pairAddress = pairAddresses[poolKey] || pool.pairAddress || 'N/A'
          return createNAStakingInfo(pool, token0, token1, pairAddress)
        }
      })

      const results = await Promise.all(stakingInfoPromises)
      const validResults = results.filter((result): result is DoubleSideStakingInfo => result !== null)

      const endTime = Date.now()
      console.log(`✅ Processed ${validResults.length} whitelisted farms successfully (filtered from ${farmingPools.length} total) in ${endTime - startTime}ms`)

      // Cache the results
      contractCache.set(cacheKey, validResults, { ttl: 45 * 1000 }) // 45 second cache

      setStakingInfos(validResults)
      hasInitiallyLoaded.current = true
    } catch (err) {
      console.error('❌ Error fetching optimized staking data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch staking data')
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [farmingPools, address, chainId, pairAddresses, refreshTrigger, provider, getLiquidityPoolManagerContract, getPoolAPR, createNAStakingInfo, useSubgraph, farmingData, subgraphError, createStakingInfoFromSubgraph])

  useEffect(() => {
    fetchStakingDataOptimized()
  }, [farmingPools, address, chainId, pairAddresses, refreshTrigger, useSubgraph, farmingData])

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
