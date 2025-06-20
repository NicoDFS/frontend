'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import './farm.css'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, ChevronDown, ChevronUp, Zap, TrendingUp, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@/hooks/useWallet'
import { useFarmingData } from '@/hooks/farming/useFarmingData'
import FarmCard from '@/components/farming/FarmCard'
import { formatNumber } from '@/lib/utils'

export default function FarmPage() {
  const { address, isConnected } = useWallet()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<{ field: string; desc: boolean }>({ field: 'totalStakedInUsd', desc: true })
  const [activeTab, setActiveTab] = useState('all')

  // Fetch farming data using enhanced hook with LiquidityPoolManagerV2
  const { stakingInfos, isLoading: stakingLoading } = useFarmingData()

  // Debug logging
  console.log('🚜 Farm page data:', {
    stakingInfos: stakingInfos?.length || 0,
    isLoading: stakingLoading,
    stakingInfosData: stakingInfos
  })

  // Keep pools loading for backward compatibility
  const poolsLoading = false

  const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value.trim().toUpperCase())
  }, [])

  const getSortField = (label: string, field: string) => {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const desc = sortBy?.field === field ? !sortBy?.desc : true
          setSortBy({ field, desc })
        }}
        className="flex items-center gap-1 text-amber-400 hover:text-amber-300"
      >
        {label}
        {sortBy?.field === field && (
          sortBy?.desc ? <ChevronDown size={16} /> : <ChevronUp size={16} />
        )}
      </Button>
    )
  }

  // Filter and sort pools
  const filteredPools = stakingInfos?.filter(pool => {
    const matchesSearch = !searchQuery || 
      pool.tokens[0].symbol.toUpperCase().includes(searchQuery) ||
      pool.tokens[1].symbol.toUpperCase().includes(searchQuery)
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'staked' && pool.stakedAmount.greaterThan('0')) ||
      (activeTab === 'super' && pool.rewardTokensAddress && pool.rewardTokensAddress.length > 0)
    
    return matchesSearch && matchesTab
  }) || []

  const sortedPools = [...filteredPools].sort((a, b) => {
    if (sortBy.field === 'totalStakedInUsd') {
      const aValue = a.totalStakedInUsd?.toNumber() || 0
      const bValue = b.totalStakedInUsd?.toNumber() || 0
      return sortBy.desc ? bValue - aValue : aValue - bValue
    }
    return 0
  })

  // Calculate total stats - memoized to prevent recalculation on every render
  const totalValueLocked = useMemo(() => {
    return stakingInfos?.reduce((acc, pool) => {
      return acc + (pool.totalStakedInUsd?.toNumber() || 0)
    }, 0) || 0
  }, [stakingInfos])

  const activeFarms = useMemo(() => {
    // Count all farms, not just active ones - let the cards show the status
    return stakingInfos?.length || 0
  }, [stakingInfos])

  return (
    <MainLayout>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="p-2 text-white hover:bg-gray-800/50"
                style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-white">LP Farming</h1>
                <p className="text-gray-300">Stake your LP tokens to earn KSWAP rewards</p>
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="text-sm text-gray-400">
              <span>Home</span>
              <span className="mx-2">/</span>
              <span className="text-white">LP Farming</span>
            </div>
          </div>

          {/* Info Card */}
          <Card className="farm-card mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">KalySwap Liquidity Mining</h2>
                  <p className="text-gray-300 text-sm">
                    Deposit your KalySwap Liquidity Provider KSL tokens to receive KSWAP, the KalySwap protocol governance token.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Total Value Locked</p>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(totalValueLocked, 0)} KLC
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search farms..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="pl-10 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400"
                />
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Sort by:</span>
                {getSortField('Liquidity', 'totalStakedInUsd')}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="bg-slate-800/50 border-slate-700/50">
                <TabsTrigger value="all" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                  All Farms
                </TabsTrigger>
                <TabsTrigger value="staked" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                  My Farms
                </TabsTrigger>
                <TabsTrigger value="super" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                  Super Farms
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Participating Pools Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Participating pools</h2>
          </div>

          {/* Farm Cards */}
          {poolsLoading || stakingLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
            </div>
          ) : sortedPools.length === 0 ? (
            <Card className="farm-card">
              <CardContent className="p-8 text-center">
                <p className="text-slate-400">No active rewards</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedPools.map((stakingInfo, index) => (
                <FarmCard
                  key={`${stakingInfo.stakingRewardAddress}-${index}`}
                  stakingInfo={stakingInfo}
                  version="2"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
