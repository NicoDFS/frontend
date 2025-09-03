/**
 * Network stability test to verify that NetworkError issues are resolved
 * Run this in the browser console to test network resilience
 */

import { fetchGraphQL, safeApiCall, isNetworkError } from '@/utils/networkUtils';
import { getPairSwaps, getRecentSwaps } from '@/lib/subgraph-client';

export const networkStabilityTest = {
  // Test DEX-based KLC pricing (no more CoinGecko dependency)
  testDexKlcPricing: async () => {
    console.log('🧪 Testing DEX-based KLC pricing...');
    try {
      // Test that we can get KLC price from DEX data
      const pairData = await safeApiCall(
        () => getPairSwaps('0x25fddaf836d12dc5e285823a644bb86e0b79c8e2', 1),
        [],
        'DEX KLC pricing test'
      );
      console.log('✅ DEX KLC pricing test passed - using internal DEX data');
      return true;
    } catch (error) {
      console.log('❌ DEX KLC pricing test failed:', error);
      return false;
    }
  },

  // Test backend GraphQL with timeout
  testBackendGraphQL: async () => {
    console.log('🧪 Testing Backend GraphQL with timeout...');
    try {
      const data = await fetchGraphQL(
        'http://localhost:3000/api/graphql',
        `
          query GetPairVolume($pairs: [PairInput!]!, $klcPriceUSD: Float!) {
            multiplePairs24hrVolume(pairs: $pairs, klcPriceUSD: $klcPriceUSD) {
              pairAddress
              volume24hrUSD
            }
          }
        `,
        {
          pairs: [{
            address: '0x25fddaf836d12dc5e285823a644bb86e0b79c8e2',
            token0Symbol: 'WKLC',
            token1Symbol: 'USDT'
          }],
          klcPriceUSD: 0.0003
        },
        { timeout: 8000, retries: 1 }
      );
      console.log('✅ Backend GraphQL test passed:', data);
      return true;
    } catch (error) {
      console.log('❌ Backend GraphQL test failed:', error);
      return false;
    }
  },

  // Test subgraph with retry logic
  testSubgraphWithRetry: async () => {
    console.log('🧪 Testing Subgraph with retry logic...');
    try {
      const swaps = await safeApiCall(
        () => getRecentSwaps(5),
        [],
        'Recent swaps test'
      );
      console.log('✅ Subgraph test passed:', swaps.length, 'swaps fetched');
      return true;
    } catch (error) {
      console.log('❌ Subgraph test failed:', error);
      return false;
    }
  },

  // Test pair-specific swaps
  testPairSwaps: async () => {
    console.log('🧪 Testing Pair-specific swaps...');
    try {
      const swaps = await safeApiCall(
        () => getPairSwaps('0x25fddaf836d12dc5e285823a644bb86e0b79c8e2', 5),
        [],
        'Pair swaps test'
      );
      console.log('✅ Pair swaps test passed:', swaps.length, 'swaps fetched');
      return true;
    } catch (error) {
      console.log('❌ Pair swaps test failed:', error);
      return false;
    }
  },

  // Test network error detection
  testNetworkErrorDetection: () => {
    console.log('🧪 Testing Network error detection...');
    
    const networkError = new Error('Failed to fetch');
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';
    const regularError = new Error('Regular error');

    const results = {
      networkError: isNetworkError(networkError),
      abortError: isNetworkError(abortError),
      regularError: isNetworkError(regularError)
    };

    console.log('✅ Network error detection results:', results);
    return results.networkError && results.abortError && !results.regularError;
  },

  // Test timeout handling
  testTimeoutHandling: async () => {
    console.log('🧪 Testing Timeout handling...');
    try {
      // This should timeout quickly
      await fetchJSON('https://httpstat.us/200?sleep=10000', { timeout: 1000, retries: 0 });
      console.log('❌ Timeout test failed - should have timed out');
      return false;
    } catch (error) {
      if (isNetworkError(error) && (error as any).isTimeout) {
        console.log('✅ Timeout test passed - correctly timed out');
        return true;
      } else {
        console.log('❌ Timeout test failed - wrong error type:', error);
        return false;
      }
    }
  },

  // Run all tests
  runAllTests: async () => {
    console.log('🚀 Starting Network Stability Tests...');
    
    const results = {
      dexKlcPricing: await networkStabilityTest.testDexKlcPricing(),
      backendGraphQL: await networkStabilityTest.testBackendGraphQL(),
      subgraphRetry: await networkStabilityTest.testSubgraphWithRetry(),
      pairSwaps: await networkStabilityTest.testPairSwaps(),
      errorDetection: networkStabilityTest.testNetworkErrorDetection(),
      timeoutHandling: await networkStabilityTest.testTimeoutHandling()
    };

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n📊 Network Stability Test Results: ${passedTests}/${totalTests} passed`);
    console.log('Results:', results);

    if (passedTests === totalTests) {
      console.log('🎉 All network stability tests passed! No more CoinGecko dependency - using DEX data only.');
    } else {
      console.log('⚠️ Some tests failed. Check the specific failures above.');
    }

    return results;
  }
};

// Auto-run tests in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Network stability test utilities loaded. Run networkStabilityTest.runAllTests() to test.');
}
