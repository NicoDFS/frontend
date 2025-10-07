/**
 * Simple Token List Test Component
 * Tests token list service without wagmi dependencies
 */

'use client';

import React, { useState, useEffect } from 'react';
import { tokenListService } from '@/services/tokenListService';
import { Token } from '@/config/dex/types';

export default function SimpleTokenListTest() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<string>('');

  const runTokenListTest = async () => {
    setLoading(true);
    setError(null);
    setTestResults('');

    try {
      console.log('🧪 Starting token list test...');

      // Test 0: Check backend API
      console.log('🔍 Testing backend API...');
      const backendTest = await fetch('http://localhost:3000/api/token-lists');
      if (backendTest.ok) {
        const backendData = await backendTest.json();
        console.log('✅ Backend API working:', backendData.message);
      } else {
        throw new Error('Backend API not responding');
      }

      // Test 1: Direct API test with headers
      console.log('🔍 Testing direct API call with headers...');
      const directResponse = await fetch('http://localhost:3000/api/token-lists/kalyswap-default', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'KalySwap/1.0'
        }
      });

      if (directResponse.ok) {
        const directData = await directResponse.json();
        setTestResults(prev => prev + `✅ Direct API call: ${directData.name} (${directData.tokens.length} tokens)\n`);
      } else {
        throw new Error(`Direct API call failed: ${directResponse.status}`);
      }

      // Test 2: Fetch KalyChain tokens via service
      console.log('📋 Fetching KalyChain tokens via service...');
      const kalyTokens = await tokenListService.getTokensForChain(3888);
      
      // Test 3: Fetch BSC tokens (if available)
      console.log('📋 Fetching BSC tokens...');
      const bscTokens = await tokenListService.getTokensForChain(56);
      
      // Test 4: Test caching
      console.log('⚡ Testing cache...');
      const startTime = Date.now();
      await tokenListService.getTokensForChain(3888);
      const cacheTime = Date.now() - startTime;
      
      // Update state
      setTokens(kalyTokens);
      
      // Generate test results
      const results = `
✅ Token List Service Test Results:

📋 KalyChain (3888): ${kalyTokens.length} tokens loaded
📋 BSC (56): ${bscTokens.length} tokens loaded
⚡ Cache test: ${cacheTime}ms (should be fast on second call)

🔍 Sample KalyChain tokens:
${kalyTokens.slice(0, 5).map(t => `  • ${t.symbol} (${t.name}) - ${t.address}`).join('\n')}

${kalyTokens.length > 5 ? `... and ${kalyTokens.length - 5} more tokens` : ''}

🎉 All tests completed successfully!
      `.trim();
      
      setTestResults(results);
      console.log('✅ Token list test completed successfully');
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setTestResults(`❌ Test failed: ${errorMsg}`);
      console.error('❌ Token list test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const runServiceTest = async () => {
    setTestResults('Running service tests...');
    
    // Capture console output
    const originalLog = console.log;
    let output = '';
    console.log = (...args) => {
      output += args.join(' ') + '\n';
      originalLog(...args);
    };

    try {
      // Import and run the test
      const { testTokenListService } = await import('@/test/tokenListService.test');
      await testTokenListService();
      setTestResults(output);
    } catch (error) {
      setTestResults(output + '\nError: ' + error);
    } finally {
      console.log = originalLog;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Simple Token List Test</h1>
        <p className="text-slate-400">
          Test the token list service without wagmi dependencies.
        </p>
      </div>

      {/* Test Controls */}
      <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
        <h2 className="text-lg font-semibold text-white mb-3">Test Controls</h2>
        <div className="flex gap-3">
          <button
            onClick={runTokenListTest}
            disabled={loading}
            className="px-4 py-2 bg-amber-500 text-black rounded hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Run Token List Test'}
          </button>
          
          <button
            onClick={runServiceTest}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-400 transition-colors"
          >
            Run Service Tests
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
        <h2 className="text-lg font-semibold text-white mb-3">Status</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Loading:</span>
            <span className={loading ? 'text-yellow-400' : 'text-green-400'}>
              {loading ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tokens Loaded:</span>
            <span className="text-white">{tokens.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Error:</span>
            <span className={error ? 'text-red-400' : 'text-green-400'}>
              {error || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
          <h2 className="text-lg font-semibold text-white mb-3">Test Results</h2>
          <div className="p-3 bg-slate-900 rounded border border-slate-700">
            <pre className="text-sm text-green-400 whitespace-pre-wrap overflow-x-auto">
              {testResults}
            </pre>
          </div>
        </div>
      )}

      {/* Token List */}
      {tokens.length > 0 && (
        <div className="p-4 bg-slate-800 rounded-lg border border-slate-600">
          <h2 className="text-lg font-semibold text-white mb-3">
            Loaded Tokens ({tokens.length})
          </h2>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {tokens.map((token, index) => (
              <div key={`${token.address}-${index}`} className="p-2 bg-slate-700 rounded text-sm">
                <div className="font-medium text-white">{token.symbol}</div>
                <div className="text-slate-400 truncate">{token.name}</div>
                <div className="text-xs text-slate-500 font-mono truncate">
                  {token.address}
                </div>
                <div className="text-xs text-amber-400">
                  Chain: {token.chainId} | Decimals: {token.decimals}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
        <h3 className="text-lg font-semibold text-white mb-3">Instructions</h3>
        <div className="text-sm text-slate-300 space-y-2">
          <p>
            <strong>1. Run Token List Test:</strong> Tests the service directly and shows loaded tokens.
          </p>
          <p>
            <strong>2. Run Service Tests:</strong> Runs comprehensive service validation tests.
          </p>
          <p>
            <strong>3. Check Network Tab:</strong> Look for requests to GitHub token list URLs.
          </p>
          <p>
            <strong>4. Check Console:</strong> Detailed logging shows the token loading process.
          </p>
        </div>
      </div>
    </div>
  );
}
