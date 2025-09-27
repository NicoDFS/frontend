/**
 * Token List Demo Component
 * Demonstrates the new token list system working alongside the existing system
 * This is for testing and demonstration purposes only
 */

'use client';

import React, { useState } from 'react';
import { useTokens } from '@/hooks/useTokens';
import { useTokenLists } from '@/hooks/useTokenLists';
import { testTokenListService } from '@/test/tokenListService.test';

export default function TokenListDemo() {
  const [showComparison, setShowComparison] = useState(false);
  const [testResults, setTestResults] = useState<string>('');

  // Existing system
  const existingSystem = useTokens();

  // New system - explicitly use KalyChain for testing
  const newSystem = useTokenLists({ chainId: 3888 });

  const runTests = async () => {
    setTestResults('Running tests...');
    
    // Capture console output
    const originalLog = console.log;
    let output = '';
    console.log = (...args) => {
      output += args.join(' ') + '\n';
      originalLog(...args);
    };

    try {
      await testTokenListService();
      setTestResults(output);
    } catch (error) {
      setTestResults(output + '\nError: ' + error);
    } finally {
      console.log = originalLog;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Token List System Demo</h1>
        <p className="text-slate-400">
          Demonstration of the new dynamic token list system alongside the existing hardcoded system.
        </p>
      </div>

      {/* Test Runner */}
      <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
        <h2 className="text-lg font-semibold text-white mb-3">Service Tests</h2>
        <button
          onClick={runTests}
          className="px-4 py-2 bg-amber-500 text-black rounded hover:bg-amber-400 transition-colors"
        >
          Run Token List Service Tests
        </button>
        
        {testResults && (
          <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-700">
            <pre className="text-sm text-green-400 whitespace-pre-wrap overflow-x-auto">
              {testResults}
            </pre>
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Existing System */}
        <div className="p-4 bg-slate-800 rounded-lg border border-slate-600">
          <h2 className="text-lg font-semibold text-white mb-3">
            Existing System (useTokens)
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className={existingSystem.loading ? 'text-yellow-400' : 'text-green-400'}>
                {existingSystem.loading ? 'Loading...' : 'Ready'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tokens:</span>
              <span className="text-white">{existingSystem.tokens.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Error:</span>
              <span className={existingSystem.error ? 'text-red-400' : 'text-green-400'}>
                {existingSystem.error || 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* New System */}
        <div className="p-4 bg-slate-800 rounded-lg border border-amber-500/30">
          <h2 className="text-lg font-semibold text-white mb-3">
            New System (useTokenLists)
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className={newSystem.loading ? 'text-yellow-400' : 'text-green-400'}>
                {newSystem.loading ? 'Loading...' : 'Ready'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tokens:</span>
              <span className="text-white">{newSystem.tokens.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Error:</span>
              <span className={newSystem.error ? 'text-red-400' : 'text-green-400'}>
                {newSystem.error || 'None'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
        >
          {showComparison ? 'Hide' : 'Show'} Token Comparison
        </button>
      </div>

      {/* Token Comparison */}
      {showComparison && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Existing Tokens */}
          <div className="p-4 bg-slate-800 rounded-lg border border-slate-600">
            <h3 className="text-lg font-semibold text-white mb-3">
              Existing Tokens ({existingSystem.tokens.length})
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {existingSystem.tokens.map((token, index) => (
                <div key={`existing-${token.address}-${index}`} className="p-2 bg-slate-700 rounded text-sm">
                  <div className="font-medium text-white">{token.symbol}</div>
                  <div className="text-slate-400 truncate">{token.name}</div>
                  <div className="text-xs text-slate-500 font-mono truncate">
                    {token.address}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New Tokens */}
          <div className="p-4 bg-slate-800 rounded-lg border border-amber-500/30">
            <h3 className="text-lg font-semibold text-white mb-3">
              New Tokens ({newSystem.tokens.length})
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {newSystem.tokens.map((token, index) => (
                <div key={`new-${token.address}-${index}`} className="p-2 bg-slate-700 rounded text-sm">
                  <div className="font-medium text-white">{token.symbol}</div>
                  <div className="text-slate-400 truncate">{token.name}</div>
                  <div className="text-xs text-slate-500 font-mono truncate">
                    {token.address}
                  </div>
                  {token.tradeVolumeUSD && (
                    <div className="text-xs text-amber-400">
                      Volume: ${parseFloat(token.tradeVolumeUSD).toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
        <h3 className="text-lg font-semibold text-white mb-3">Usage Instructions</h3>
        <div className="text-sm text-slate-300 space-y-2">
          <p>
            <strong>Phase 1 Complete:</strong> The new token list system is now available alongside the existing system.
          </p>
          <p>
            <strong>Current Status:</strong> Both systems are running in parallel. Components still use the existing useTokens hook.
          </p>
          <p>
            <strong>Next Steps:</strong> In Phase 2, components will be gradually migrated to use useTokenLists instead of useTokens.
          </p>
          <p>
            <strong>Testing:</strong> Use the "Run Tests" button above to verify the token list service is working correctly.
          </p>
        </div>
      </div>
    </div>
  );
}
