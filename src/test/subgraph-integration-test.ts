/**
 * Test file to validate Phase 1 subgraph integration
 * This file tests the updated hooks to ensure they work with subgraph data
 */

// Test functions to validate subgraph integration
export const testSubgraphIntegration = {
  
  // Test token data fetching
  testTokensQuery: async () => {
    console.log('🧪 Testing tokens query...');
    
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query TestTokens {
              tokens(first: 5, orderBy: tradeVolumeUSD, orderDirection: desc) {
                id
                symbol
                name
                decimals
                tradeVolumeUSD
                totalLiquidity
                derivedKLC
                txCount
              }
            }
          `
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error('❌ Tokens query failed:', result.errors);
        return false;
      }

      console.log('✅ Tokens query successful:', result.data?.tokens?.length || 0, 'tokens found');
      return true;
    } catch (err) {
      console.error('❌ Tokens query error:', err);
      return false;
    }
  },

  // Test pairs data fetching
  testPairsQuery: async () => {
    console.log('🧪 Testing pairs query...');
    
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query TestPairs {
              pairs(first: 3, orderBy: reserveUSD, orderDirection: desc) {
                id
                token0 { symbol }
                token1 { symbol }
                reserve0
                reserve1
                reserveUSD
                volumeUSD
                txCount
              }
            }
          `
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error('❌ Pairs query failed:', result.errors);
        return false;
      }

      console.log('✅ Pairs query successful:', result.data?.pairs?.length || 0, 'pairs found');
      return true;
    } catch (err) {
      console.error('❌ Pairs query error:', err);
      return false;
    }
  },

  // Test factory data fetching
  testFactoryQuery: async () => {
    console.log('🧪 Testing factory query...');
    
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query TestFactory {
              factory(id: "0xd42af909d323d88e0e933b6c50d3e91c279004ca") {
                id
                totalVolumeUSD
                totalLiquidityUSD
                txCount
                pairCount
              }
            }
          `
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error('❌ Factory query failed:', result.errors);
        return false;
      }

      console.log('✅ Factory query successful:', result.data?.factory);
      return true;
    } catch (err) {
      console.error('❌ Factory query error:', err);
      return false;
    }
  },

  // Test specific pair lookup
  testPairLookup: async (token0: string, token1: string) => {
    console.log('🧪 Testing pair lookup for:', token0, token1);
    
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query TestPairLookup($token0: String!, $token1: String!) {
              pairs(where: { 
                or: [
                  { and: [{ token0: $token0 }, { token1: $token1 }] },
                  { and: [{ token0: $token1 }, { token1: $token0 }] }
                ]
              }) {
                id
                token0 { id symbol }
                token1 { id symbol }
                reserve0
                reserve1
                reserveUSD
              }
            }
          `,
          variables: {
            token0: token0.toLowerCase(),
            token1: token1.toLowerCase()
          }
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        console.error('❌ Pair lookup failed:', result.errors);
        return false;
      }

      const pairs = result.data?.pairs || [];
      console.log('✅ Pair lookup successful:', pairs.length, 'pairs found');
      return pairs.length > 0;
    } catch (err) {
      console.error('❌ Pair lookup error:', err);
      return false;
    }
  },

  // Run all tests
  runAllTests: async () => {
    console.log('🚀 Starting Phase 1 subgraph integration tests...');
    
    const results = {
      tokens: await testSubgraphIntegration.testTokensQuery(),
      pairs: await testSubgraphIntegration.testPairsQuery(),
      factory: await testSubgraphIntegration.testFactoryQuery(),
      pairLookup: await testSubgraphIntegration.testPairLookup(
        '0x069255299bb729399f3cecabdc73d15d3d10a2a3', // WKLC
        '0x2ca775c77b922a51fcf3097f52bffdbc0250d99a'  // USDT
      )
    };

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All Phase 1 tests passed! Subgraph integration is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please check the subgraph connection and queries.');
    }

    return results;
  }
};

// Export for use in browser console or components
if (typeof window !== 'undefined') {
  (window as any).testSubgraphIntegration = testSubgraphIntegration;
}
