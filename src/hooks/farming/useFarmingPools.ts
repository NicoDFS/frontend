'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { DoubleSideStaking } from '@/types/farming'
import { FARMING_CONFIG } from '@/config/farming'

export function useFarmingPools() {
  const { chainId } = useWallet()
  const [pools, setPools] = useState<DoubleSideStaking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPools = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Get pools from config for the current chain (default to KalyChain)
        const currentChainId = chainId || 3888
        const chainPools = FARMING_CONFIG.DOUBLE_SIDE_STAKING_REWARDS_INFO[currentChainId] || []
        
        // Flatten all versions and filter active pools
        const allPools = chainPools.flat().filter(pool => {
          // Only include pools that are not expired or have staked amounts
          return true // For now, include all pools
        })

        setPools(allPools)
      } catch (err) {
        console.error('Error fetching farming pools:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch farming pools')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPools()
  }, [chainId])

  return {
    pools,
    isLoading,
    error,
    refetch: () => {
      const currentChainId = chainId || 3888
      const chainPools = FARMING_CONFIG.DOUBLE_SIDE_STAKING_REWARDS_INFO[currentChainId] || []
      const allPools = chainPools.flat()
      setPools(allPools)
    }
  }
}
