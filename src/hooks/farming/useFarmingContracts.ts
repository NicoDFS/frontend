'use client'

import { useCallback } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { BigNumber, Contract, ethers } from 'ethers'
import { FARMING_CONFIG } from '@/config/farming'
import liquidityPoolManagerV2ABI from '@/config/abis/dex/liqudityPoolManagerV2ABI.json'
import treasuryVesterABI from '@/config/abis/dex/treasuryVesterABI.json'
import stakingRewardsABI from '@/config/abis/dex/stakingRewardsABI.json'
import { ContractEncoder, estimateContractGas, getCurrentGasPrice } from '@/utils/contractEncoder'

interface StakingContractData {
  stakedAmount: BigNumber
  earnedAmount: BigNumber
  totalStakedAmount: BigNumber
  rewardRate: BigNumber
  periodFinish: number
  poolWeight: BigNumber
  totalWeight: BigNumber
  stakingContractAddress: string
  klcLiquidity: BigNumber
}

interface APRData {
  swapFeeApr: number
  stakingApr: number
  combinedApr: number
}

interface WhitelistedPool {
  pair: string
  weight: BigNumber
  isActive: boolean
}

export function useFarmingContracts() {
  const { chainId, signTransaction } = useWallet()

  // Contract addresses for KalyChain
  const LIQUIDITY_POOL_MANAGER_V2_ADDRESS = '0xe83e7ede1358FA87e5039CF8B1cffF383Bc2896A'
  const TREASURY_VESTER_ADDRESS = '0x4C4b968232a8603e2D1e53AB26E9a0319fA33ED3'

  // Create a provider for reading contract data
  const getProvider = useCallback(() => {
    // Use KalyChain RPC for reading contract data
    return new ethers.providers.JsonRpcProvider('https://rpc.kalychain.io/rpc')
  }, [])

  const getLiquidityPoolManagerContract = useCallback(() => {
    const provider = getProvider()
    if (!provider) return null
    return new Contract(LIQUIDITY_POOL_MANAGER_V2_ADDRESS, liquidityPoolManagerV2ABI, provider)
  }, [getProvider])

  const getTreasuryVesterContract = useCallback(() => {
    const provider = getProvider()
    if (!provider) return null
    return new Contract(TREASURY_VESTER_ADDRESS, treasuryVesterABI, provider)
  }, [getProvider])

  const getWhitelistedPools = useCallback(async (): Promise<WhitelistedPool[]> => {
    try {
      const contract = getLiquidityPoolManagerContract()
      if (!contract) return []

      console.log('🔍 Fetching whitelisted pools from LiquidityPoolManagerV2...')

      // Get number of pools first
      const numPools = await contract.numPools()
      console.log(`📊 Total pools in contract: ${numPools.toString()}`)

      const pools: WhitelistedPool[] = []

      // Import farming config to get all known pair addresses
      const { LP_FARMING_POOLS } = await import('@/config/farming')

      // Extract all known pair addresses from config
      const knownPairAddresses = Object.values(LP_FARMING_POOLS)
        .map(pool => pool.pairAddress)
        .filter((address): address is string => address !== undefined) // Remove undefined addresses with type guard

      console.log('🔍 Checking known pair addresses:', knownPairAddresses)

      // Also try to get pair addresses dynamically from factory for pools without hardcoded addresses
      const poolsWithoutAddresses = Object.values(LP_FARMING_POOLS)
        .filter(pool => !pool.pairAddress)

      console.log(`🔍 Found ${poolsWithoutAddresses.length} pools without hardcoded addresses`)

      // For now, let's focus on the known pair address and add more discovery later
      const allPairAddresses = [...knownPairAddresses]

      // Check each known pair
      for (const pairAddress of allPairAddresses) {
        try {
          console.log(`🔍 Checking pair: ${pairAddress}`)

          const [isWhitelisted, weight] = await Promise.all([
            contract.isWhitelisted(pairAddress),
            contract.weights(pairAddress)
          ])

          console.log(`  - Whitelisted: ${isWhitelisted}`)
          console.log(`  - Weight: ${weight.toString()}`)

          if (isWhitelisted) {
            pools.push({
              pair: pairAddress,
              weight,
              isActive: weight.gt(0)
            })
            console.log(`  ✅ Added to whitelisted pools`)
          } else {
            console.log(`  ❌ Not whitelisted`)
          }
        } catch (pairError) {
          console.warn(`❌ Error checking pair ${pairAddress}:`, pairError)
        }
      }

      console.log(`✅ Found ${pools.length} whitelisted pools`)
      return pools
    } catch (error) {
      console.error('❌ Error fetching whitelisted pools:', error)
      return []
    }
  }, [getLiquidityPoolManagerContract])

  const getStakingInfo = useCallback(async (
    pairAddress: string,
    userAddress?: string
  ): Promise<StakingContractData | null> => {
    try {
      const liquidityManagerContract = getLiquidityPoolManagerContract()
      const provider = getProvider()

      if (!liquidityManagerContract || !provider) {
        console.warn('Contracts not available - provider not connected')
        return null
      }

      try {
        console.log(`🔍 Getting staking info for pair: ${pairAddress}`)

        // Step 1: Get basic pool info from LiquidityPoolManagerV2
        const poolInfoResults = await Promise.allSettled([
          liquidityManagerContract.isWhitelisted(pairAddress),
          liquidityManagerContract.weights(pairAddress),
          liquidityManagerContract.getKlcLiquidity(pairAddress), // This might fail for non-WKLC pairs
          liquidityManagerContract.stakes(pairAddress) // 🎯 Get the actual staking contract!
        ])

        const isWhitelisted = poolInfoResults[0].status === 'fulfilled' ? poolInfoResults[0].value : false
        const poolWeight = poolInfoResults[1].status === 'fulfilled' ? poolInfoResults[1].value : BigNumber.from('0')
        const klcLiquidity = poolInfoResults[2].status === 'fulfilled' ? poolInfoResults[2].value : BigNumber.from('0')
        const stakingContractAddress = poolInfoResults[3].status === 'fulfilled' ? poolInfoResults[3].value : ''

        // Log if getKlcLiquidity failed (expected for KSWAP/USDT)
        if (poolInfoResults[2].status === 'rejected') {
          console.log(`⚠️  getKlcLiquidity failed for ${pairAddress} (likely non-WKLC pair): ${poolInfoResults[2].reason?.message || 'Unknown error'}`)
        }

        console.log(`📊 Pool registry data for ${pairAddress}:`)
        console.log(`  - Is whitelisted: ${isWhitelisted}`)
        console.log(`  - Pool weight: ${poolWeight.toString()}`)
        console.log(`  - KLC Liquidity: ${klcLiquidity.toString()}`)
        console.log(`  - Staking contract: ${stakingContractAddress}`)

        if (!isWhitelisted) {
          console.warn(`❌ Pool ${pairAddress} is not whitelisted`)
          return null
        }

        if (!stakingContractAddress || stakingContractAddress === '0x0000000000000000000000000000000000000000') {
          console.warn(`❌ No staking contract found for ${pairAddress}`)
          return null
        }

        // Step 2: Query the individual staking contract for real data
        const stakingContract = new Contract(stakingContractAddress, stakingRewardsABI, provider)

        const stakingResults = await Promise.allSettled([
          stakingContract.totalSupply(), // Total LP tokens staked
          stakingContract.rewardRate(), // KSWAP per second
          stakingContract.periodFinish(), // When rewards end
          userAddress ? stakingContract.balanceOf(userAddress) : Promise.resolve(BigNumber.from('0')), // User's staked amount
          userAddress ? stakingContract.earned(userAddress) : Promise.resolve(BigNumber.from('0')), // User's earned rewards
        ])

        // Extract staking contract results
        const totalSupply = stakingResults[0].status === 'fulfilled' ? stakingResults[0].value : BigNumber.from('0')
        const rewardRate = stakingResults[1].status === 'fulfilled' ? stakingResults[1].value : BigNumber.from('0')
        const periodFinish = stakingResults[2].status === 'fulfilled' ? stakingResults[2].value.toNumber() : 0
        const userStakedAmount = stakingResults[3].status === 'fulfilled' ? stakingResults[3].value : BigNumber.from('0')
        const userEarnedAmount = stakingResults[4].status === 'fulfilled' ? stakingResults[4].value : BigNumber.from('0')

        console.log(`📊 Staking contract data:`)
        console.log(`  - Total staked: ${totalSupply.toString()} LP tokens`)
        console.log(`  - Reward rate: ${rewardRate.toString()} KSWAP/second`)
        console.log(`  - Period finish: ${periodFinish} (${new Date(periodFinish * 1000).toISOString()})`)
        console.log(`  - User staked: ${userStakedAmount.toString()} LP tokens`)
        console.log(`  - User earned: ${userEarnedAmount.toString()} KSWAP`)

        // Log any failed staking contract calls
        stakingResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            const callNames = ['totalSupply', 'rewardRate', 'periodFinish', 'balanceOf', 'earned']
            console.error(`❌ Failed staking call ${callNames[index]}:`, result.reason)
          }
        })

        // If pool is not whitelisted, return null
        if (!isWhitelisted) {
          console.warn(`❌ Pool ${pairAddress} is not whitelisted`)
          return null
        }

        // Return the real staking data from the individual staking contract
        return {
          stakedAmount: userStakedAmount, // Real user staked amount from staking contract
          earnedAmount: userEarnedAmount, // Real user earned amount from staking contract
          totalStakedAmount: totalSupply, // Real total staked LP tokens from staking contract
          rewardRate: rewardRate, // Real reward rate from staking contract
          periodFinish: periodFinish, // Real period finish from staking contract
          poolWeight,
          totalWeight: BigNumber.from('100'), // Assuming weights are out of 100
          stakingContractAddress, // Include the staking contract address
          klcLiquidity // Include KLC liquidity for TVL display
        }
      } catch (contractError) {
        console.error('❌ Contract calls failed:', contractError)
        return null
      }
    } catch (error) {
      console.error('Error fetching staking info:', error)
      return null
    }
  }, [getLiquidityPoolManagerContract, getTreasuryVesterContract])

  const getPoolAPR = useCallback(async (
    pairAddress: string
  ): Promise<APRData | null> => {
    try {
      const liquidityManagerContract = getLiquidityPoolManagerContract()
      const treasuryVesterContract = getTreasuryVesterContract()

      if (!liquidityManagerContract || !treasuryVesterContract) {
        console.warn('Contracts not available for APR calculation')
        return null
      }

      try {
        // Get contract data for APR calculation using available methods
        const results = await Promise.allSettled([
          liquidityManagerContract.weights(pairAddress),
          liquidityManagerContract.numPools(),
          liquidityManagerContract.isWhitelisted(pairAddress),
          treasuryVesterContract.vestingAmount(),
          treasuryVesterContract.halvingPeriod(),
          treasuryVesterContract.vestingEnabled()
        ])

        const poolWeight = results[0].status === 'fulfilled' ? results[0].value : BigNumber.from('0')
        const numPools = results[1].status === 'fulfilled' ? results[1].value : BigNumber.from('1')
        const isWhitelisted = results[2].status === 'fulfilled' ? results[2].value : false
        const vestingAmount = results[3].status === 'fulfilled' ? results[3].value : BigNumber.from('0')
        const halvingPeriod = results[4].status === 'fulfilled' ? results[4].value : 0
        const vestingEnabled = results[5].status === 'fulfilled' ? results[5].value : false

        // If pool is not whitelisted or no vesting, return 0 APR
        if (!isWhitelisted || !vestingEnabled || poolWeight.eq(0)) {
          return {
            swapFeeApr: 0,
            stakingApr: 0,
            combinedApr: 0
          }
        }

        // Calculate annual rewards based on vesting schedule
        const annualRewards = halvingPeriod > 0
          ? vestingAmount.mul(365 * 24 * 60 * 60).div(halvingPeriod)
          : BigNumber.from('0')

        // Calculate pool's share of rewards (simplified - equal distribution among pools)
        const poolAnnualRewards = numPools.gt(0) ? annualRewards.div(numPools) : BigNumber.from('0')

        // TODO: Get real pool liquidity from pair contract
        // For now, return 0 to indicate N/A until we implement liquidity fetching
        const stakingApr = 0 // Will be 0 until we implement liquidity calculation
        const swapFeeApr = 0 // Will be 0 until we implement volume/fee calculation

        return {
          swapFeeApr,
          stakingApr,
          combinedApr: stakingApr + swapFeeApr
        }
      } catch (contractError) {
        console.error('Contract APR calculation failed:', contractError)
        return null
      }
    } catch (error) {
      console.error('Error fetching pool APR:', error)
      return null
    }
  }, [getLiquidityPoolManagerContract, getTreasuryVesterContract])

  const addLiquidityToPool = useCallback(async (
    pairAddress: string,
    amount: BigNumber
  ): Promise<string | null> => {
    try {
      if (!signTransaction) return null

      const contract = getLiquidityPoolManagerContract()
      if (!contract) return null

      // TODO: Implement actual liquidity addition through LiquidityPoolManagerV2
      // This would involve calling the appropriate method on the contract
      console.log('Adding liquidity to pool:', { pairAddress, amount: amount.toString() })

      // Mock transaction for now
      const mockTx = {
        to: LIQUIDITY_POOL_MANAGER_V2_ADDRESS,
        data: '0x', // Would be encoded function call
        value: '0'
      }

      return await signTransaction(mockTx)
    } catch (error) {
      console.error('Error adding liquidity:', error)
      return null
    }
  }, [getLiquidityPoolManagerContract, signTransaction])

  const removeLiquidityFromPool = useCallback(async (
    pairAddress: string,
    amount: BigNumber
  ): Promise<string | null> => {
    try {
      if (!signTransaction) return null

      const contract = getLiquidityPoolManagerContract()
      if (!contract) return null

      // TODO: Implement actual liquidity removal through LiquidityPoolManagerV2
      console.log('Removing liquidity from pool:', { pairAddress, amount: amount.toString() })

      // Mock transaction for now
      const mockTx = {
        to: LIQUIDITY_POOL_MANAGER_V2_ADDRESS,
        data: '0x', // Would be encoded function call
        value: '0'
      }

      return await signTransaction(mockTx)
    } catch (error) {
      console.error('Error removing liquidity:', error)
      return null
    }
  }, [getLiquidityPoolManagerContract, signTransaction])

  const claimVestedRewards = useCallback(async (): Promise<string | null> => {
    try {
      if (!signTransaction) return null

      const contract = getTreasuryVesterContract()
      if (!contract) return null

      console.log('Claiming vested rewards from TreasuryVester')

      // Encode the claim() function call
      const data = ContractEncoder.encodeClaim()

      // Get provider for gas estimation
      const provider = getProvider()

      // Estimate gas and get gas price
      const [gasLimit, gasPrice] = await Promise.all([
        estimateContractGas(provider, TREASURY_VESTER_ADDRESS, data),
        getCurrentGasPrice(provider)
      ])

      const tx = {
        to: TREASURY_VESTER_ADDRESS,
        data,
        value: '0',
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }

      return await signTransaction(tx)
    } catch (error) {
      console.error('Error claiming vested rewards:', error)
      return null
    }
  }, [getTreasuryVesterContract, signTransaction, getProvider])

  const calculateAndDistribute = useCallback(async (): Promise<string | null> => {
    try {
      if (!signTransaction) return null

      const contract = getLiquidityPoolManagerContract()
      if (!contract) return null

      console.log('Triggering calculate and distribute')

      // Encode the calculateAndDistribute() function call
      const data = ContractEncoder.encodeCalculateAndDistribute()

      // Get provider for gas estimation
      const provider = getProvider()

      // Estimate gas and get gas price
      const [gasLimit, gasPrice] = await Promise.all([
        estimateContractGas(provider, LIQUIDITY_POOL_MANAGER_V2_ADDRESS, data),
        getCurrentGasPrice(provider)
      ])

      const tx = {
        to: LIQUIDITY_POOL_MANAGER_V2_ADDRESS,
        data,
        value: '0',
        gasLimit: gasLimit.toString(),
        gasPrice: gasPrice.toString()
      }

      return await signTransaction(tx)
    } catch (error) {
      console.error('Error calculating and distributing:', error)
      return null
    }
  }, [getLiquidityPoolManagerContract, signTransaction, getProvider])

  // Approve LP tokens for staking
  const approveLPTokens = useCallback(async (
    lpTokenAddress: string,
    stakingRewardAddress: string,
    amount: BigNumber
  ): Promise<string | null> => {
    try {
      if (!signTransaction) return null

      const provider = getProvider()
      if (!provider) return null

      // Create ERC20 contract instance for the LP token
      const lpTokenContract = new ethers.Contract(
        lpTokenAddress,
        [
          'function approve(address spender, uint256 amount) external returns (bool)',
        ],
        provider
      )

      const encodedData = lpTokenContract.interface.encodeFunctionData('approve', [stakingRewardAddress, amount])

      console.log('Approving LP tokens:', {
        lpTokenAddress,
        stakingRewardAddress,
        amount: amount.toString()
      })

      const tx = {
        to: lpTokenAddress,
        data: encodedData,
        value: '0'
      }

      return await signTransaction(tx)
    } catch (error) {
      console.error('Error approving LP tokens:', error)
      return null
    }
  }, [signTransaction, getProvider])

  // Stake LP tokens using stakeWithPermit (combines approval + staking in one tx)
  const stakeLPTokensWithPermit = useCallback(async (
    stakingRewardAddress: string,
    lpTokenAddress: string,
    amount: BigNumber
  ): Promise<string | null> => {
    try {
      if (!signTransaction) return null

      const provider = getProvider()
      if (!provider) return null

      // Create deadline (20 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + 1200

      // Create the permit signature data
      const domain = {
        name: 'KalySwap LP', // This might need to be adjusted based on the actual LP token name
        version: '1',
        chainId: 3888,
        verifyingContract: lpTokenAddress
      }

      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ]
      }

      // Get user's address from wallet
      const accounts = await provider.listAccounts()
      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet accounts found')
      }
      const userAddress = accounts[0]

      // Get nonce from LP token contract
      const lpTokenContract = new ethers.Contract(
        lpTokenAddress,
        [
          'function nonces(address owner) view returns (uint256)',
        ],
        provider
      )

      const nonce = await lpTokenContract.nonces(userAddress)

      const message = {
        owner: userAddress,
        spender: stakingRewardAddress,
        value: amount.toString(),
        nonce: nonce.toString(),
        deadline: deadline.toString()
      }

      // Sign the permit
      const signature = await provider.send('eth_signTypedData_v4', [
        userAddress,
        JSON.stringify({ domain, types, primaryType: 'Permit', message })
      ])

      // Split signature into v, r, s
      const sig = ethers.utils.splitSignature(signature)

      // Create staking contract instance
      const stakingContract = new ethers.Contract(
        stakingRewardAddress,
        [
          'function stakeWithPermit(uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external',
        ],
        provider
      )

      const encodedData = stakingContract.interface.encodeFunctionData('stakeWithPermit', [
        amount,
        deadline,
        sig.v,
        sig.r,
        sig.s
      ])

      console.log('Staking LP tokens with permit:', {
        stakingRewardAddress,
        lpTokenAddress,
        amount: amount.toString(),
        deadline,
        signature: sig
      })

      const tx = {
        to: stakingRewardAddress,
        data: encodedData,
        value: '0'
      }

      return await signTransaction(tx)
    } catch (error) {
      console.error('Error staking LP tokens with permit:', error)
      return null
    }
  }, [signTransaction, getProvider])

  // Fallback stake method (requires separate approval)
  const stakeLPTokens = useCallback(async (
    stakingRewardAddress: string,
    amount: BigNumber,
    version: number = 2
  ): Promise<string | null> => {
    try {
      if (!signTransaction) return null

      const provider = getProvider()
      if (!provider) return null

      // Create contract instance for the specific staking reward contract
      const stakingContract = new ethers.Contract(
        stakingRewardAddress,
        [
          'function stake(uint256 amount) external',
        ],
        provider
      )

      const encodedData = stakingContract.interface.encodeFunctionData('stake', [amount])

      console.log('Staking LP tokens (fallback method):', {
        stakingRewardAddress,
        amount: amount.toString()
      })

      const tx = {
        to: stakingRewardAddress,
        data: encodedData,
        value: '0'
      }

      return await signTransaction(tx)
    } catch (error) {
      console.error('Error staking LP tokens:', error)
      return null
    }
  }, [signTransaction, getProvider])

  // Unstake LP tokens from a specific staking reward contract
  const unstakeLPTokens = useCallback(async (
    stakingRewardAddress: string,
    amount: BigNumber,
    version: number = 2
  ): Promise<string | null> => {
    try {
      if (!signTransaction) return null

      const provider = getProvider()
      if (!provider) return null

      // Create contract instance for the specific staking reward contract
      const stakingContract = new ethers.Contract(
        stakingRewardAddress,
        [
          'function withdraw(uint256 amount) external',
          'function exit() external', // For withdrawing all + claiming rewards
        ],
        provider
      )

      // For now, use withdraw method
      const encodedData = stakingContract.interface.encodeFunctionData('withdraw', [amount])

      console.log('Unstaking LP tokens:', {
        stakingRewardAddress,
        amount: amount.toString(),
        version
      })

      const tx = {
        to: stakingRewardAddress,
        data: encodedData,
        value: '0'
      }

      return await signTransaction(tx)
    } catch (error) {
      console.error('Error unstaking LP tokens:', error)
      return null
    }
  }, [signTransaction, getProvider])

  return {
    getStakingInfo,
    getPoolAPR,
    getWhitelistedPools,
    addLiquidityToPool,
    removeLiquidityFromPool,
    claimVestedRewards,
    calculateAndDistribute,
    approveLPTokens,
    stakeLPTokens,
    stakeLPTokensWithPermit,
    unstakeLPTokens,
    getLiquidityPoolManagerContract,
    getTreasuryVesterContract
  }
}
