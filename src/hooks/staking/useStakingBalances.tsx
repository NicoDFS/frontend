/**
 * Staking Balance Integration Hook
 * 
 * Integrates staking data with the existing wallet system
 * Provides formatted balances and validation utilities
 */

import { useEffect, useState } from 'react'
import { formatEther } from 'viem'
import { useWallet } from '@/hooks/useWallet'
import { useStakingUserData } from './useStakingData'
import { 
  toFixedDigits, 
  formatKLCAmount, 
  parseKLCAmount, 
  validateStakeAmount,
  calcEndingTime 
} from '@/utils/staking/mathHelpers'

/**
 * Comprehensive staking balances hook
 * Integrates with wallet and provides formatted data
 */
export function useStakingBalances(userAddress?: string) {
  const { address: walletAddress, isConnected } = useWallet()
  const address = userAddress || walletAddress
  const stakingData = useStakingUserData(address)
  
  // Formatted balances
  const klcBalanceFormatted = stakingData.klcBalanceFormatted
  const stakedBalanceFormatted = formatEther(stakingData.stakedBalance)
  const earnedRewardsFormatted = formatEther(stakingData.earnedRewards)
  const totalStakedFormatted = formatEther(stakingData.totalStaked)

  // Display-friendly formatted values
  const displayBalances = {
    klcBalance: toFixedDigits(Number(klcBalanceFormatted)),
    stakedBalance: toFixedDigits(Number(stakedBalanceFormatted)),
    earnedRewards: toFixedDigits(Number(earnedRewardsFormatted)),
    totalStaked: toFixedDigits(Number(totalStakedFormatted)),
    apr: stakingData.apr.toFixed(1),
  }

  // Calculate days remaining
  const daysRemaining = calcEndingTime(stakingData.periodFinish)

  // Validation helpers
  const validateStake = (amount: string) => {
    return validateStakeAmount(amount, stakingData.klcBalance)
  }

  const validateWithdraw = (amount: string) => {
    return validateStakeAmount(amount, stakingData.stakedBalance)
  }

  // Check if user has any staking activity
  const hasStakedBalance = stakingData.stakedBalance > BigInt(0)
  const hasEarnedRewards = stakingData.earnedRewards > BigInt(0)
  const hasAnyStakingActivity = hasStakedBalance || hasEarnedRewards

  // Calculate user's share of total pool
  const poolSharePercentage = stakingData.totalStaked > BigInt(0) 
    ? Number((stakingData.stakedBalance * BigInt(10000)) / stakingData.totalStaked) / 100
    : 0

  return {
    // Raw balances (bigint)
    klcBalance: stakingData.klcBalance,
    stakedBalance: stakingData.stakedBalance,
    earnedRewards: stakingData.earnedRewards,
    totalStaked: stakingData.totalStaked,
    
    // Formatted balances (strings)
    klcBalanceFormatted,
    stakedBalanceFormatted,
    earnedRewardsFormatted,
    totalStakedFormatted,
    
    // Display balances (formatted for UI)
    displayBalances,
    
    // Staking metrics
    apr: stakingData.apr,
    daysRemaining,
    poolSharePercentage,
    
    // Status flags
    isConnected,
    hasStakedBalance,
    hasEarnedRewards,
    hasAnyStakingActivity,
    isPaused: stakingData.isPaused,
    isLoading: stakingData.isLoading,
    
    // Validation functions
    validateStake,
    validateWithdraw,
    
    // Utility functions
    parseKLCAmount,
    formatKLCAmount,
    
    // Refetch function
    refetchBalances: stakingData.refetchUserData,
  }
}

/**
 * Hook for staking form validation and helpers
 */
export function useStakingForm() {
  const [stakeAmount, setStakeAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [stakeError, setStakeError] = useState<string | null>(null)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  
  const balances = useStakingBalances()

  // Validate stake amount on change
  useEffect(() => {
    if (stakeAmount) {
      const validation = balances.validateStake(stakeAmount)
      setStakeError(validation.isValid ? null : validation.error || null)
    } else {
      setStakeError(null)
    }
  }, [stakeAmount, balances])

  // Validate withdraw amount on change
  useEffect(() => {
    if (withdrawAmount) {
      const validation = balances.validateWithdraw(withdrawAmount)
      setWithdrawError(validation.isValid ? null : validation.error || null)
    } else {
      setWithdrawError(null)
    }
  }, [withdrawAmount, balances])

  // Helper functions
  const setMaxStakeAmount = () => {
    setStakeAmount(balances.klcBalanceFormatted)
  }

  const setMaxWithdrawAmount = () => {
    setWithdrawAmount(balances.stakedBalanceFormatted)
  }

  const clearStakeForm = () => {
    setStakeAmount('')
    setStakeError(null)
  }

  const clearWithdrawForm = () => {
    setWithdrawAmount('')
    setWithdrawError(null)
  }

  const isStakeValid = stakeAmount && !stakeError && Number(stakeAmount) > 0
  const isWithdrawValid = withdrawAmount && !withdrawError && Number(withdrawAmount) > 0

  return {
    // Form state
    stakeAmount,
    withdrawAmount,
    setStakeAmount,
    setWithdrawAmount,
    
    // Validation
    stakeError,
    withdrawError,
    isStakeValid,
    isWithdrawValid,
    
    // Helper functions
    setMaxStakeAmount,
    setMaxWithdrawAmount,
    clearStakeForm,
    clearWithdrawForm,
    
    // Balances (re-exported for convenience)
    ...balances,
  }
}

/**
 * Hook for staking statistics and metrics
 */
export function useStakingStats() {
  const balances = useStakingBalances()
  
  // Calculate estimated daily rewards for user
  const estimatedDailyRewards = balances.stakedBalance > BigInt(0) && balances.apr > 0
    ? Number(balances.stakedBalance) * (balances.apr / 100) / 365 / 10**18
    : 0

  // Calculate estimated monthly rewards
  const estimatedMonthlyRewards = estimatedDailyRewards * 30

  // Calculate estimated yearly rewards
  const estimatedYearlyRewards = estimatedDailyRewards * 365

  return {
    // Basic stats
    totalStaked: balances.totalStaked,
    totalStakedFormatted: balances.displayBalances.totalStaked,
    apr: balances.apr,
    daysRemaining: balances.daysRemaining,
    
    // User stats
    userStaked: balances.stakedBalance,
    userStakedFormatted: balances.displayBalances.stakedBalance,
    userRewards: balances.earnedRewards,
    userRewardsFormatted: balances.displayBalances.earnedRewards,
    poolSharePercentage: balances.poolSharePercentage,
    
    // Projections
    estimatedDailyRewards: toFixedDigits(estimatedDailyRewards),
    estimatedMonthlyRewards: toFixedDigits(estimatedMonthlyRewards),
    estimatedYearlyRewards: toFixedDigits(estimatedYearlyRewards),
    
    // Status
    isPaused: balances.isPaused,
    isLoading: balances.isLoading,
  }
}
