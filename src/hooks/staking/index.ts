/**
 * Staking Hooks Index
 * 
 * Centralized exports for all staking-related hooks
 * Based on production KalyCoinStaking patterns
 */

// Data hooks (read-only)
export {
  useKLCBalance,
  useStakedBalance,
  useEarnedRewards,
  useTotalStaked,
  useRewardRate,
  useRewardPeriod,
  useRewardForDuration,
  useAPR,
  useStakingPaused,
  useStakingUserData,
} from './useStakingData'

// Action hooks (write operations)
export {
  useStakeKLC,
  useWithdrawKLC,
  useClaimRewards,
  useExitStaking,
  useStakingActions,
} from './useStakingActions'

// Balance and form hooks
export {
  useStakingBalances,
  useStakingForm,
  useStakingStats,
} from './useStakingBalances'

// Re-export types and utilities
export type {
  StakingContractConfig,
  StakingFunctions,
  StakingEvents,
} from '@/config/contracts/staking'
