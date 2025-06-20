import { ethers } from 'ethers'
import liquidityPoolManagerV2ABI from './config/abis/dex/liqudityPoolManagerV2ABI.json'
import treasuryVesterABI from './config/abis/dex/treasuryVesterABI.json'
import stakingRewardsABI from './config/abis/dex/stakingRewardsABI.json'

// Contract addresses
const LIQUIDITY_POOL_MANAGER_V2_ADDRESS = '0xe83e7ede1358FA87e5039CF8B1cffF383Bc2896A'
const TREASURY_VESTER_ADDRESS = '0x4C4b968232a8603e2D1e53AB26E9a0319fA33ED3'
const RPC_URL = 'https://rpc.kalychain.io/rpc'

// Known staking contract addresses and their pool types
const STAKING_CONTRACTS = [
  { address: '0x2bD4B7f303C1f372689d52A55ec202E0cf831a26', name: 'WKLC/DAI' },
  { address: '0xD9238e463dc69c976C5452e8159100DfA1a5A157', name: 'WKLC/USDT' },
  { address: '0x9FC553A1b7241A24Aef20894375c6da706205734', name: 'WKLC/USDC' },
  { address: '0x85723D1c8c4d1944992EB02532de53037C98A667', name: 'WKLC/ETH' },
  { address: '0xE2912ecBd06185A6DBA68d49b700AD06e98055E4', name: 'WKLC/POL' },
  { address: '0xA3eB9877968DBe481B8D72797035D39CC9656733', name: 'WKLC/BNB' },
  { address: '0x3B7c8132B3253b9EBBdF08Eb849254eFFe22664b', name: 'WKLC/WBTC' },
  { address: '0xA9f1eB89452f825Bbc59007FAe13233953910582', name: 'KSWAP/WKLC' },
  { address: '0xD4B2B42663A095e5503d820Ad9291Df2B6BDa1fb', name: 'KSWAP/USDT' }
]

// Known pair addresses to test (we'll discover more from staking contracts)
const TEST_PAIR_ADDRESSES = [
  '0x25FDDaF836d12dC5e285823a644bb86E0b79c8e2', // WKLC/USDT
]

async function testFarmingContracts() {
  console.log('🔍 Testing Farming Contracts...')
  console.log('=====================================')

  try {
    // Create provider
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    console.log('✅ Provider connected to KalyChain RPC')

    // Create contract instances
    const liquidityManager = new ethers.Contract(
      LIQUIDITY_POOL_MANAGER_V2_ADDRESS,
      liquidityPoolManagerV2ABI,
      provider
    )

    const treasuryVester = new ethers.Contract(
      TREASURY_VESTER_ADDRESS,
      treasuryVesterABI,
      provider
    )

    console.log('✅ Contract instances created')

    // Test LiquidityPoolManagerV2 contract
    console.log('\n📊 Testing LiquidityPoolManagerV2...')
    console.log('-----------------------------------')

    try {
      const numPools = await liquidityManager.numPools()
      console.log(`Number of pools: ${numPools.toString()}`)
    } catch (error) {
      console.error('❌ Error getting numPools:', error)
    }

    // Test each known pair address
    for (const pairAddress of TEST_PAIR_ADDRESSES) {
      console.log(`\n🔍 Testing pair: ${pairAddress}`)

      try {
        const isWhitelisted = await liquidityManager.isWhitelisted(pairAddress)
        console.log(`  Is whitelisted: ${isWhitelisted}`)

        const weight = await liquidityManager.weights(pairAddress)
        console.log(`  Weight: ${weight.toString()}`)

        // Test the key method for getting TVL data
        const klcLiquidity = await liquidityManager.getKlcLiquidity(pairAddress)
        console.log(`  KLC Liquidity (TVL): ${ethers.utils.formatEther(klcLiquidity)} KLC`)

        // Test other useful methods
        const isKlcPair = await liquidityManager.isKlcPair(pairAddress)
        console.log(`  Is KLC pair: ${isKlcPair}`)

        const isKswapPair = await liquidityManager.isKswapPair(pairAddress)
        console.log(`  Is KSWAP pair: ${isKswapPair}`)

        // 🎯 THE KEY METHOD - Get the actual staking contract address!
        const stakingContractAddress = await liquidityManager.stakes(pairAddress)
        console.log(`  Staking contract address: ${stakingContractAddress}`)

        if (stakingContractAddress && stakingContractAddress !== '0x0000000000000000000000000000000000000000') {
          console.log(`  ✅ Found staking contract for ${pairAddress}`)
        } else {
          console.log(`  ❌ No staking contract found for ${pairAddress}`)
        }

      } catch (error) {
        console.error(`  ❌ Error testing pair ${pairAddress}:`, error)
      }
    }

    // Test additional LiquidityPoolManagerV2 methods
    console.log(`\n🔧 Testing additional LiquidityPoolManagerV2 methods...`)
    try {
      const unallocatedKswap = await liquidityManager.unallocatedKswap()
      console.log(`Unallocated KSWAP: ${ethers.utils.formatEther(unallocatedKswap)} KSWAP`)

      const klcKswapPair = await liquidityManager.klcKswapPair()
      console.log(`KLC-KSWAP pair address: ${klcKswapPair}`)

      const splitPools = await liquidityManager.splitPools()
      console.log(`Split pools enabled: ${splitPools}`)

      const klcSplit = await liquidityManager.klcSplit()
      console.log(`KLC split: ${klcSplit.toString()}`)

      const kswapSplit = await liquidityManager.kswapSplit()
      console.log(`KSWAP split: ${kswapSplit.toString()}`)

      // Test distribution method
      try {
        const distribution0 = await liquidityManager.distribution(0)
        console.log(`Distribution[0]: ${distribution0.toString()}`)
      } catch (distError) {
        console.log(`Distribution method not available or no data`)
      }

    } catch (error) {
      console.error(`❌ Error testing additional methods:`, error)
    }

    // Test TreasuryVester contract
    console.log('\n💰 Testing TreasuryVester...')
    console.log('----------------------------')

    try {
      const vestingEnabled = await treasuryVester.vestingEnabled()
      console.log(`Vesting enabled: ${vestingEnabled}`)

      const vestingAmount = await treasuryVester.vestingAmount()
      console.log(`Vesting amount: ${ethers.utils.formatEther(vestingAmount)} tokens`)

      const vestingCliff = await treasuryVester.vestingCliff()
      console.log(`Vesting cliff: ${vestingCliff.toString()} (timestamp)`)

      const halvingPeriod = await treasuryVester.halvingPeriod()
      console.log(`Halving period: ${halvingPeriod.toString()} seconds`)

      const lastUpdate = await treasuryVester.lastUpdate()
      console.log(`Last update: ${lastUpdate.toString()} (timestamp)`)
      console.log(`Last update date: ${new Date(lastUpdate.toNumber() * 1000).toISOString()}`)

      // Calculate if vesting period is active
      const currentTime = Math.floor(Date.now() / 1000)
      const isVestingActive = vestingEnabled && currentTime >= vestingCliff.toNumber()
      console.log(`Is vesting currently active: ${isVestingActive}`)

      if (halvingPeriod.gt(0)) {
        const periodEndTime = lastUpdate.add(halvingPeriod)
        const isPeriodFinished = currentTime >= periodEndTime.toNumber()
        console.log(`Current period finished: ${isPeriodFinished}`)
        console.log(`Period end time: ${new Date(periodEndTime.toNumber() * 1000).toISOString()}`)
      }

    } catch (error) {
      console.error('❌ Error testing TreasuryVester:', error)
    }

    // Test all 9 staking contracts directly
    console.log('\n🎯 Testing All 9 Staking Contracts...')
    console.log('------------------------------------')

    const discoveredPairs = []

    for (const stakingInfo of STAKING_CONTRACTS) {
      try {
        console.log(`\n📋 Testing ${stakingInfo.name} staking contract`)
        console.log(`   Contract: ${stakingInfo.address}`)

        // Create staking contract instance
        const stakingContract = new ethers.Contract(
          stakingInfo.address,
          stakingRewardsABI,
          provider
        )

        // Test staking contract methods
        const stakingResults = await Promise.allSettled([
          stakingContract.totalSupply(),
          stakingContract.rewardRate(),
          stakingContract.periodFinish(),
          stakingContract.rewardsToken(),
          stakingContract.stakingToken() // This gives us the pair address!
        ])

        const totalSupply = stakingResults[0].status === 'fulfilled' ? stakingResults[0].value : 'FAILED'
        const rewardRate = stakingResults[1].status === 'fulfilled' ? stakingResults[1].value : 'FAILED'
        const periodFinish = stakingResults[2].status === 'fulfilled' ? stakingResults[2].value : 'FAILED'
        const rewardsToken = stakingResults[3].status === 'fulfilled' ? stakingResults[3].value : 'FAILED'
        const pairAddress = stakingResults[4].status === 'fulfilled' ? stakingResults[4].value : 'FAILED'

        console.log(`   Pair address: ${pairAddress}`)
        console.log(`   Total staked: ${totalSupply !== 'FAILED' ? ethers.utils.formatEther(totalSupply) : 'FAILED'} LP tokens`)
        console.log(`   Reward rate: ${rewardRate !== 'FAILED' ? ethers.utils.formatEther(rewardRate) : 'FAILED'} KSWAP/second`)
        console.log(`   Period finish: ${periodFinish !== 'FAILED' ? new Date(periodFinish.toNumber() * 1000).toISOString() : 'FAILED'}`)
        console.log(`   Rewards token: ${rewardsToken}`)

        if (pairAddress !== 'FAILED') {
          discoveredPairs.push({
            name: stakingInfo.name,
            pairAddress: pairAddress,
            stakingContract: stakingInfo.address
          })

          // Test if this pair is whitelisted in LiquidityPoolManagerV2
          try {
            const isWhitelisted = await liquidityManager.isWhitelisted(pairAddress)
            const weight = await liquidityManager.weights(pairAddress)
            const klcLiquidity = await liquidityManager.getKlcLiquidity(pairAddress)

            console.log(`   ✅ Pool registry data:`)
            console.log(`      - Whitelisted: ${isWhitelisted}`)
            console.log(`      - Weight: ${weight.toString()}`)
            console.log(`      - KLC Liquidity: ${ethers.utils.formatEther(klcLiquidity)} KLC`)
          } catch (registryError) {
            console.log(`   ❌ Error checking pool registry: ${registryError instanceof Error ? registryError.message : String(registryError)}`)
          }
        }

      } catch (error) {
        console.error(`❌ Error testing staking contract ${stakingInfo.name}:`, error)
      }
    }

    // Summary of discovered pairs
    console.log('\n📋 DISCOVERED PAIR ADDRESSES:')
    console.log('============================')
    discoveredPairs.forEach(pair => {
      console.log(`${pair.name}: ${pair.pairAddress}`)
    })

  } catch (error) {
    console.error('❌ Fatal error:', error)
  }

  console.log('\n🏁 Test completed!')
}

// Export for use in browser console or Node.js
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testFarmingContracts = testFarmingContracts
  console.log('🌐 Test function available as window.testFarmingContracts()')
} else {
  // Node.js environment
  testFarmingContracts().catch(console.error)
}

export { testFarmingContracts }
