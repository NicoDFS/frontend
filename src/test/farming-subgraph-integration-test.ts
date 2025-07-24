/**
 * Test file to validate Phase 2 farming subgraph integration
 * This file tests the updated farming hooks to ensure they work with subgraph data
 */

// Test functions to validate farming subgraph integration
export const testFarmingSubgraphIntegration = {
  
  // Test farming pools query
  testFarmingPoolsQuery: async () => {
    console.log('🧪 Testing farming pools query...');
    
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query TestFarmingPools {
              farmingPools(first: 5) {
                id
                address
                stakingToken
                rewardsToken
                totalStaked
                rewardRate
                periodFinish
              }
            }
          `
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error('❌ Farming pools query failed:', result.errors);
        return false;
      }

      console.log('✅ Farming pools query successful:', result.data?.farmingPools?.length || 0, 'pools found');
      return true;
    } catch (err) {
      console.error('❌ Farming pools query error:', err);
      return false;
    }
  },

  // Test whitelisted pools query
  testWhitelistedPoolsQuery: async () => {
    console.log('🧪 Testing whitelisted pools query...');
    
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query TestWhitelistedPools {
              whitelistedPools(first: 5) {
                id
                pairAddress
                weight
                stakingPool {
                  id
                  address
                }
              }
            }
          `
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error('❌ Whitelisted pools query failed:', result.errors);
        return false;
      }

      console.log('✅ Whitelisted pools query successful:', result.data?.whitelistedPools?.length || 0, 'pools found');
      return true;
    } catch (err) {
      console.error('❌ Whitelisted pools query error:', err);
      return false;
    }
  },

  // Test user farming positions query
  testUserFarmingPositionsQuery: async (userAddress: string) => {
    console.log('🧪 Testing user farming positions query for:', userAddress);
    
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query TestUserFarmingPositions($userAddress: String!) {
              farmers(where: { address: $userAddress }) {
                id
                address
                stakedAmount
                rewards
                pool {
                  id
                  address
                  stakingToken
                  rewardsToken
                }
              }
            }
          `,
          variables: {
            userAddress: userAddress.toLowerCase()
          }
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error('❌ User farming positions query failed:', result.errors);
        return false;
      }

      const farmers = result.data?.farmers || [];
      console.log('✅ User farming positions query successful:', farmers.length, 'positions found');
      return true;
    } catch (err) {
      console.error('❌ User farming positions query error:', err);
      return false;
    }
  },

  // Test specific farming pool query
  testSpecificFarmingPoolQuery: async (poolAddress: string) => {
    console.log('🧪 Testing specific farming pool query for:', poolAddress);
    
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query TestSpecificFarmingPool($poolId: String!) {
              farmingPool(id: $poolId) {
                id
                address
                stakingToken
                rewardsToken
                totalStaked
                rewardRate
                periodFinish
                farmers(first: 5) {
                  id
                  address
                  stakedAmount
                  rewards
                }
              }
            }
          `,
          variables: {
            poolId: poolAddress.toLowerCase()
          }
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error('❌ Specific farming pool query failed:', result.errors);
        return false;
      }

      const pool = result.data?.farmingPool;
      if (pool) {
        console.log('✅ Specific farming pool query successful:', pool.address);
        console.log('   - Total staked:', pool.totalStaked);
        console.log('   - Farmers:', pool.farmers?.length || 0);
        return true;
      } else {
        console.log('⚠️ No farming pool found for address:', poolAddress);
        return false;
      }
    } catch (err) {
      console.error('❌ Specific farming pool query error:', err);
      return false;
    }
  },

  // Test farming pool by staking token
  testFarmingPoolByStakingToken: async (stakingToken: string) => {
    console.log('🧪 Testing farming pool by staking token:', stakingToken);
    
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query TestFarmingPoolByStakingToken($stakingToken: String!) {
              farmingPools(where: { stakingToken: $stakingToken }) {
                id
                address
                stakingToken
                rewardsToken
                totalStaked
                rewardRate
                periodFinish
              }
            }
          `,
          variables: {
            stakingToken: stakingToken.toLowerCase()
          }
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error('❌ Farming pool by staking token query failed:', result.errors);
        return false;
      }

      const pools = result.data?.farmingPools || [];
      console.log('✅ Farming pool by staking token query successful:', pools.length, 'pools found');
      return pools.length > 0;
    } catch (err) {
      console.error('❌ Farming pool by staking token query error:', err);
      return false;
    }
  },

  // Test farming statistics
  testFarmingStatistics: async () => {
    console.log('🧪 Testing farming statistics...');
    
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query TestFarmingStatistics {
              farmingPools {
                id
                totalStaked
                rewardRate
              }
              farmers {
                id
                stakedAmount
                rewards
              }
            }
          `
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error('❌ Farming statistics query failed:', result.errors);
        return false;
      }

      const pools = result.data?.farmingPools || [];
      const farmers = result.data?.farmers || [];
      
      // Calculate total statistics
      const totalStaked = pools.reduce((sum: number, pool: any) => {
        return sum + parseFloat(pool.totalStaked || '0');
      }, 0);
      
      const totalFarmers = farmers.length;
      const activeFarmers = farmers.filter((farmer: any) => 
        parseFloat(farmer.stakedAmount || '0') > 0
      ).length;

      console.log('✅ Farming statistics calculated:');
      console.log('   - Total pools:', pools.length);
      console.log('   - Total staked:', totalStaked.toFixed(2));
      console.log('   - Total farmers:', totalFarmers);
      console.log('   - Active farmers:', activeFarmers);
      
      return true;
    } catch (err) {
      console.error('❌ Farming statistics query error:', err);
      return false;
    }
  },

  // Run all farming tests
  runAllFarmingTests: async () => {
    console.log('🚀 Starting Phase 2 farming subgraph integration tests...');
    
    const results = {
      farmingPools: await testFarmingSubgraphIntegration.testFarmingPoolsQuery(),
      whitelistedPools: await testFarmingSubgraphIntegration.testWhitelistedPoolsQuery(),
      userPositions: await testFarmingSubgraphIntegration.testUserFarmingPositionsQuery(
        '0x12ba3f424d630a583bdbca56b0c1a0a7c1d7d66e' // Test user address from subgraph data
      ),
      specificPool: await testFarmingSubgraphIntegration.testSpecificFarmingPoolQuery(
        '0xa9f1eb89452f825bbc59007fae13233953910582' // KSWAP/WKLC pool
      ),
      poolByStakingToken: await testFarmingSubgraphIntegration.testFarmingPoolByStakingToken(
        '0xf3e034650e1c2597a0af75012c1854247f271ee0' // KSWAP/WKLC LP token
      ),
      farmingStatistics: await testFarmingSubgraphIntegration.testFarmingStatistics()
    };

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n📊 Phase 2 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All Phase 2 farming tests passed! Farming subgraph integration is working correctly.');
    } else {
      console.log('⚠️ Some farming tests failed. Please check the farming subgraph connection and queries.');
    }

    return results;
  }
};

// Export for use in browser console or components
if (typeof window !== 'undefined') {
  (window as any).testFarmingSubgraphIntegration = testFarmingSubgraphIntegration;
}
