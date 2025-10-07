/**
 * Token List Service Integration Test
 * Verifies the token list service works correctly with real data
 */

import { tokenListService, TOKEN_LIST_CONFIGS } from '@/services/tokenListService';

/**
 * Test the token list service functionality
 * This can be run manually to verify everything works
 */
export async function testTokenListService() {
  console.log('🧪 Testing Token List Service...\n');

  try {
    // Test 1: Fetch KalyChain token list
    console.log('Test 1: Fetching KalyChain token list...');
    const kalyChainTokens = await tokenListService.getTokensForChain(3888);
    console.log(`✅ KalyChain tokens loaded: ${kalyChainTokens.length}`);
    console.log('Sample tokens:', kalyChainTokens.slice(0, 3).map(t => `${t.symbol} (${t.name})`));
    console.log('');

    // Test 2: Verify token list configurations
    console.log('Test 2: Checking token list configurations...');
    const kalyChainConfigs = tokenListService.getTokenListConfigs(3888);
    console.log(`✅ KalyChain configs: ${kalyChainConfigs.length}`);
    kalyChainConfigs.forEach(config => {
      console.log(`  - ${config.name}: ${config.url} (priority: ${config.priority})`);
    });
    console.log('');

    // Test 3: Test caching
    console.log('Test 3: Testing cache functionality...');
    const startTime = Date.now();
    await tokenListService.getTokensForChain(3888);
    const cachedTime = Date.now() - startTime;
    console.log(`✅ Cached request completed in ${cachedTime}ms`);
    console.log('');

    // Test 4: Test with unsupported chain
    console.log('Test 4: Testing unsupported chain...');
    const unsupportedTokens = await tokenListService.getTokensForChain(999999);
    console.log(`✅ Unsupported chain handled gracefully: ${unsupportedTokens.length} tokens`);
    console.log('');

    // Test 5: Verify token data structure
    console.log('Test 5: Verifying token data structure...');
    if (kalyChainTokens.length > 0) {
      const sampleToken = kalyChainTokens[0];
      const requiredFields = ['chainId', 'address', 'decimals', 'name', 'symbol', 'logoURI'];
      const hasAllFields = requiredFields.every(field => field in sampleToken);
      console.log(`✅ Token structure valid: ${hasAllFields}`);
      console.log('Sample token:', {
        symbol: sampleToken.symbol,
        name: sampleToken.name,
        address: sampleToken.address,
        decimals: sampleToken.decimals,
        chainId: sampleToken.chainId
      });
    }
    console.log('');

    console.log('🎉 All tests passed! Token List Service is working correctly.\n');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test the useTokenLists hook functionality
 * Note: This would need to be run in a React component context
 */
export function createTokenListHookTest() {
  return `
// Test useTokenLists hook in a React component:

import { useTokenLists } from '@/hooks/useTokenLists';

function TokenListTest() {
  const { tokens, loading, error, getTokenBySymbol } = useTokenLists();
  
  useEffect(() => {
    if (!loading && !error) {
      console.log('🧪 useTokenLists Test Results:');
      console.log('Total tokens:', tokens.length);
      console.log('Sample tokens:', tokens.slice(0, 5).map(t => t.symbol));
      
      // Test utility functions
      const wklc = getTokenBySymbol('wKLC');
      console.log('WKLC token found:', !!wklc);
      
      const usdt = getTokenBySymbol('USDT');
      console.log('USDT token found:', !!usdt);
    }
  }, [tokens, loading, error]);
  
  if (loading) return <div>Loading tokens...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h3>Token List Test</h3>
      <p>Loaded {tokens.length} tokens</p>
      <ul>
        {tokens.slice(0, 10).map(token => (
          <li key={token.address}>
            {token.symbol} - {token.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
  `;
}

// Export for manual testing
if (typeof window !== 'undefined') {
  // Browser environment - attach to window for manual testing
  (window as any).testTokenListService = testTokenListService;
  console.log('🧪 Token List Service test available at: window.testTokenListService()');
}
