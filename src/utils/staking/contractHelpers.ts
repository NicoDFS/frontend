/**
 * Contract Helper Functions for Staking
 * 
 * Utilities for encoding contract function calls and handling transactions
 */

import { encodeFunctionData } from 'viem'
import { STAKING_CONTRACT } from '@/config/contracts/staking'

/**
 * Encode stake function call
 * Note: stake() is payable with no parameters, so we just need the function selector
 */
export function encodeStakeCall(): `0x${string}` {
  return encodeFunctionData({
    abi: STAKING_CONTRACT.abi,
    functionName: 'stake',
    args: [],
  })
}

/**
 * Encode withdraw function call
 * @param amount - Amount to withdraw in Wei (bigint)
 */
export function encodeWithdrawCall(amount: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: STAKING_CONTRACT.abi,
    functionName: 'withdraw',
    args: [amount],
  })
}

/**
 * Encode claimReward function call
 */
export function encodeClaimRewardCall(): `0x${string}` {
  return encodeFunctionData({
    abi: STAKING_CONTRACT.abi,
    functionName: 'claimReward',
    args: [],
  })
}

/**
 * Encode exit function call
 */
export function encodeExitCall(): `0x${string}` {
  return encodeFunctionData({
    abi: STAKING_CONTRACT.abi,
    functionName: 'exit',
    args: [],
  })
}

/**
 * Create a staking transaction object
 * @param functionData - Encoded function data
 * @param value - ETH value to send (for stake function)
 */
export function createStakingTransaction(
  functionData: `0x${string}`,
  value: bigint = BigInt(0)
) {
  return {
    to: STAKING_CONTRACT.address,
    value,
    data: functionData,
  }
}

/**
 * Get function selector for a given function name
 * Useful for debugging and logging
 */
export function getFunctionSelector(functionName: string): string {
  const functionData = encodeFunctionData({
    abi: STAKING_CONTRACT.abi,
    functionName: functionName as any,
    args: [],
  })
  return functionData.slice(0, 10) // First 4 bytes (8 hex chars + 0x)
}

/**
 * Validate staking contract address
 */
export function isValidStakingContract(address: string): boolean {
  return address.toLowerCase() === STAKING_CONTRACT.address.toLowerCase()
}

/**
 * Get gas estimates for staking functions
 * These are rough estimates based on typical usage
 */
export const GAS_ESTIMATES = {
  STAKE: BigInt(100000),
  WITHDRAW: BigInt(80000),
  CLAIM_REWARD: BigInt(60000),
  EXIT: BigInt(120000),
} as const

/**
 * Get estimated gas for a staking function
 */
export function getEstimatedGas(functionName: keyof typeof GAS_ESTIMATES): bigint {
  return GAS_ESTIMATES[functionName]
}
