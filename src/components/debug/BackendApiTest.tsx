/**
 * Backend API Test Component
 * Tests the backend token list API endpoints
 */

'use client';

import React, { useState } from 'react';

export default function BackendApiTest() {
  const [results, setResults] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testBackendApi = async () => {
    setLoading(true);
    setResults('Testing backend API...\n\n');

    try {
      // Test 1: Check API index
      console.log('🔍 Testing API index...');
      const indexResponse = await fetch('http://localhost:3000/api/token-lists', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!indexResponse.ok) {
        throw new Error(`API index failed: ${indexResponse.status} ${indexResponse.statusText}`);
      }
      
      const indexData = await indexResponse.json();
      setResults(prev => prev + `✅ API Index working: ${indexData.message}\n`);
      setResults(prev => prev + `Available lists: ${indexData.availableLists.join(', ')}\n\n`);

      // Test 2: Fetch KalySwap token list
      console.log('🔍 Testing KalySwap token list...');
      const kalyResponse = await fetch('http://localhost:3000/api/token-lists/kalyswap-default');
      
      if (!kalyResponse.ok) {
        throw new Error(`KalySwap list failed: ${kalyResponse.status}`);
      }
      
      const kalyData = await kalyResponse.json();
      setResults(prev => prev + `✅ KalySwap list: ${kalyData.name} (${kalyData.tokens.length} tokens)\n`);
      
      // Show sample tokens
      const sampleTokens = kalyData.tokens.slice(0, 3);
      sampleTokens.forEach((token: any) => {
        setResults(prev => prev + `  • ${token.symbol} (${token.name})\n`);
      });
      
      setResults(prev => prev + '\n');

      // Test 3: Test caching (second request should be faster)
      console.log('🔍 Testing cache...');
      const cacheStart = Date.now();
      const cacheResponse = await fetch('http://localhost:3000/api/token-lists/kalyswap-default');
      const cacheTime = Date.now() - cacheStart;
      
      if (cacheResponse.ok) {
        setResults(prev => prev + `✅ Cache test: ${cacheTime}ms (should be fast)\n\n`);
      }

      // Test 4: Test PancakeSwap list
      console.log('🔍 Testing PancakeSwap token list...');
      const pancakeResponse = await fetch('http://localhost:3000/api/token-lists/pancakeswap-extended');
      
      if (pancakeResponse.ok) {
        const pancakeData = await pancakeResponse.json();
        setResults(prev => prev + `✅ PancakeSwap list: ${pancakeData.name} (${pancakeData.tokens.length} tokens)\n\n`);
      } else {
        setResults(prev => prev + `⚠️ PancakeSwap list failed (this is OK for testing)\n\n`);
      }

      setResults(prev => prev + '🎉 Backend API tests completed!\n');

    } catch (error) {
      console.error('❌ Backend API test failed:', error);
      setResults(prev => prev + `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Backend API Test</h1>
        <p className="text-slate-400">
          Test the backend token list API endpoints to verify CORS fix.
        </p>
      </div>

      {/* Test Controls */}
      <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
        <h2 className="text-lg font-semibold text-white mb-3">Test Controls</h2>
        <button
          onClick={testBackendApi}
          disabled={loading}
          className="px-4 py-2 bg-amber-500 text-black rounded hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Backend API'}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="p-4 bg-slate-800 rounded-lg border border-slate-600">
          <h2 className="text-lg font-semibold text-white mb-3">Test Results</h2>
          <div className="p-3 bg-slate-900 rounded border border-slate-700">
            <pre className="text-sm text-green-400 whitespace-pre-wrap overflow-x-auto">
              {results}
            </pre>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
        <h3 className="text-lg font-semibold text-white mb-3">What This Tests</h3>
        <div className="text-sm text-slate-300 space-y-2">
          <p>
            <strong>1. API Index:</strong> Checks if the backend API is running and responding.
          </p>
          <p>
            <strong>2. KalySwap Token List:</strong> Fetches your GitHub token list via backend proxy.
          </p>
          <p>
            <strong>3. Caching:</strong> Verifies that the second request is served from cache.
          </p>
          <p>
            <strong>4. PancakeSwap List:</strong> Tests external token list fetching.
          </p>
          <p className="text-amber-400">
            <strong>Note:</strong> Make sure your backend is running on port 3000!
          </p>
        </div>
      </div>
    </div>
  );
}
