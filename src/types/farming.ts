import { BigNumber } from 'ethers'

export interface Token {
  address: string
  symbol: string
  name: string
  decimals: number
  chainId: number
}

export interface TokenAmount {
  token: Token
  raw: BigNumber
  toSignificant: (digits: number, options?: { groupSeparator?: string }) => string
  toFixed: (digits: number, options?: { groupSeparator?: string }) => string
  toNumber: () => number
  greaterThan: (other: TokenAmount | string) => boolean
  lessThan: (other: TokenAmount | string) => boolean
  equalTo: (other: TokenAmount | string) => boolean
}

export interface StakingInfoBase {
  // the address of the reward contract
  stakingRewardAddress: string
  // the amount of token currently staked, or undefined if no account
  stakedAmount: TokenAmount
  // the amount of reward token earned by the active account, or undefined if no account
  earnedAmount: TokenAmount
  // the total amount of token staked in the contract
  totalStakedAmount: TokenAmount
  // the amount of token distributed per second to all LPs, constant
  totalRewardRatePerSecond: TokenAmount
  totalRewardRatePerWeek: TokenAmount
  // the current amount of token distributed to the active account per week.
  // equivalent to percent of total supply * reward rate * (60 * 60 * 24 * 7)
  rewardRatePerWeek: TokenAmount
  // when the period ends
  periodFinish: Date | undefined
  // has the reward period expired
  isPeriodFinished: boolean
  // calculates a hypothetical amount of token distributed to the active account per second.
  getHypotheticalWeeklyRewardRate: (
    stakedAmount: TokenAmount,
    totalStakedAmount: TokenAmount,
    totalRewardRatePerSecond: TokenAmount
  ) => TokenAmount
}

export interface DoubleSideStakingInfo extends StakingInfoBase {
  // the tokens involved in this pair
  tokens: [Token, Token]
  // the pool weight
  multiplier: BigNumber
  // total staked KLC in the pool
  totalStakedInWklc: TokenAmount
  totalStakedInUsd: TokenAmount
  rewardTokensAddress?: Array<string>
  rewardsAddress?: string
  rewardTokensMultiplier?: Array<BigNumber>
  getExtraTokensWeeklyRewardRate?: (
    rewardRatePerWeek: TokenAmount,
    token: Token,
    tokenMultiplier: BigNumber | undefined
  ) => TokenAmount
  // APR data
  swapFeeApr?: number
  stakingApr?: number
  combinedApr?: number
}

export interface SingleSideStakingInfo extends StakingInfoBase {
  // the token being earned
  rewardToken: Token
  // total staked KSWAP in the pool
  totalStakedInKswap: TokenAmount
  apr: BigNumber
}

export interface DoubleSideStaking {
  tokens: [Token, Token]
  stakingRewardAddress: string
  version: number
  multiplier?: number
  pairAddress?: string // LP token pair address for LiquidityPoolManagerV2
}

export interface SingleSideStaking {
  rewardToken: Token
  conversionRouteHops: Token[]
  stakingRewardAddress: string
  version: number
}

export interface MinichefStakingInfo {
  // the address of the reward contract
  stakingRewardAddress: string
  // the amount of token currently staked, or undefined if no account
  stakedAmount: TokenAmount
  // the amount of reward token earned by the active account, or undefined if no account
  earnedAmount: TokenAmount
  // the total amount of token staked in the contract
  totalStakedAmount: TokenAmount
  swapFeeApr?: number
  stakingApr?: number
  combinedApr?: number
  // the tokens involved in this pair
  tokens: [Token, Token]
  // the pool weight
  multiplier: BigNumber
  totalStakedInUsd: TokenAmount
  // has the reward period expired
  isPeriodFinished: boolean
  rewardTokens?: Array<Token>
  rewardsAddress?: string
  isLoading: boolean
  pid: string
}

export interface MinichefFarmRewarder {
  id: string
  rewards: Array<{
    id: string
    token: Token
    multiplier: BigNumber
  }>
}

export interface MinichefPair {
  id: string
  reserve0: string
  reserve1: string
  totalSupply: string
  token0: Token
  token1: Token
}

export interface FarmingPositions {
  id: string
  stakedTokenBalance: string
}

export interface MinichefFarm {
  id: string
  pid: string
  tvl: number
  allocPoint: number
  rewarderAddress: string
  chefAddress: string
  pairAddress: string
  rewarder: MinichefFarmRewarder
  pair: MinichefPair
  farmingPositions: FarmingPositions[]
  earnedAmount?: number
  swapFeeApr?: number
  stakingApr?: number
  combinedApr?: number
}

export interface MinichefV2 {
  id: string
  totalAllocPoint: number
  rewardPerSecond: number
  rewardsExpiration: number
  farms: Array<MinichefFarm>
}

export interface StakingModalProps {
  isOpen: boolean
  onDismiss: () => void
  stakingInfo: DoubleSideStakingInfo
  userLiquidityUnstaked?: TokenAmount
  version: number
  extraRewardTokensAmount?: Array<TokenAmount>
  onSuccess?: () => void // Callback to refresh data after successful transaction
}

export interface UnstakingModalProps {
  isOpen: boolean
  onDismiss: () => void
  stakingInfo: DoubleSideStakingInfo
  version: number
  extraRewardTokensAmount?: Array<TokenAmount>
  onSuccess?: () => void // Callback to refresh data after successful transaction
}

export interface ClaimRewardModalProps {
  isOpen: boolean
  onDismiss: () => void
  stakingInfo: DoubleSideStakingInfo
  version: number
  extraRewardTokensAmount?: Array<TokenAmount>
  onSuccess?: () => void // Callback to refresh data after successful transaction
}

export enum SortingType {
  totalStakedInUsd = 'totalStakedInUsd',
  totalApr = 'totalApr'
}

export interface FarmingConfig {
  MINICHEF_ADDRESS: { [chainId: number]: string }
  LIQUIDITY_POOL_MANAGER_V2_ADDRESS: string
  TREASURY_VESTER_ADDRESS: string
  DOUBLE_SIDE_STAKING_REWARDS_INFO: { [chainId: number]: DoubleSideStaking[][] }
  SINGLE_SIDE_STAKING_REWARDS_INFO: { [chainId: number]: SingleSideStaking[][] }
}
