/**
 * Multichain Token System Test Component
 * Tests native tokens, balances, and search functionality across chains
 */

'use client';

import React, { useState } from 'react';
import { useTokenLists } from '@/hooks/useTokenLists';
import { useMultichainTokenBalance } from '@/hooks/useMultichainTokenBalance';
import { useAccount, useChainId } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MultichainTokenTest() {
  const [selectedChainId, setSelectedChainId] = useState<number>(3888);
  const [searchQuery, setSearchQuery] = useState('');

  // Load tokens for selected chain
  const { tokens, loading: tokensLoading, error: tokensError } = useTokenLists({ chainId: selectedChainId });


  
  // Get wallet info (safely handle if not in WagmiProvider)
  let address: string | undefined;
  let isConnected: boolean = false;
  let currentChainId: number | undefined;

  try {
    const account = useAccount();
    address = account.address;
    isConnected = account.isConnected;
    currentChainId = useChainId();
  } catch (error) {
    console.log('Not in WagmiProvider context, using fallback values');
    address = undefined;
    isConnected = false;
    currentChainId = undefined;
  }
  
  // Load balances for tokens
  const { balances, getFormattedBalance, isLoading: balancesLoading } = useMultichainTokenBalance(tokens, isConnected);

  // Filter tokens by search
  const filteredTokens = tokens.filter(token => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.address.toLowerCase().includes(query)
    );
  });

  // Chain configurations
  const chains = [
    { id: 3888, name: 'KalyChain', symbol: 'KLC' },
    { id: 56, name: 'BSC', symbol: 'BNB' },
    { id: 42161, name: 'Arbitrum', symbol: 'ETH' }
  ];

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Multichain Token System Test</h1>
          <p className="text-slate-400">
            Testing native tokens, balances, and search functionality across KalyChain, BSC, and Arbitrum.
          </p>
        </div>

        {/* Wallet Status */}
        <Card className="mb-6 bg-slate-800 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white">Wallet Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Connected:</span>
                <span className={`ml-2 font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Address:</span>
                <span className="ml-2 font-mono text-white">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Current Chain:</span>
                <span className="ml-2 font-medium text-white">
                  {currentChainId || 'Unknown'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chain Selector */}
        <Card className="mb-6 bg-slate-800 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white">Select Chain to Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {chains.map((chain) => (
                <Button
                  key={chain.id}
                  onClick={() => setSelectedChainId(chain.id)}
                  variant={selectedChainId === chain.id ? "default" : "outline"}
                  className={selectedChainId === chain.id ? 
                    "bg-amber-600 hover:bg-amber-700" : 
                    "border-slate-600 text-slate-300 hover:bg-slate-700"
                  }
                >
                  {chain.name} ({chain.symbol})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Token Search */}
        <Card className="mb-6 bg-slate-800 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white">Token Search Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              placeholder="Search tokens by name, symbol, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            />
            <p className="text-sm text-slate-400 mt-2">
              Try searching for: "KLC", "BNB", "ETH", "USDT", "USDC"
            </p>
          </CardContent>
        </Card>

        {/* Token List Results */}
        <Card className="bg-slate-800 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white">
              Token List Results - {chains.find(c => c.id === selectedChainId)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Loading States */}
            {tokensLoading && (
              <div className="flex items-center gap-2 text-blue-400 mb-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span>Loading tokens...</span>
              </div>
            )}

            {balancesLoading && isConnected && (
              <div className="flex items-center gap-2 text-green-400 mb-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                <span>Loading balances...</span>
              </div>
            )}

            {/* Error States */}
            {tokensError && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-400">Token Loading Error: {tokensError}</p>
              </div>
            )}

            {/* Results Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 text-sm">
              <div className="bg-slate-700 p-3 rounded-lg">
                <div className="text-slate-400">Total Tokens</div>
                <div className="text-2xl font-bold text-white">{tokens.length}</div>
              </div>
              <div className="bg-slate-700 p-3 rounded-lg">
                <div className="text-slate-400">Filtered Tokens</div>
                <div className="text-2xl font-bold text-white">{filteredTokens.length}</div>
              </div>
              <div className="bg-slate-700 p-3 rounded-lg">
                <div className="text-slate-400">Native Tokens</div>
                <div className="text-2xl font-bold text-white">
                  {tokens.filter(t => t.isNative).length}
                </div>
              </div>
              <div className="bg-slate-700 p-3 rounded-lg">
                <div className="text-slate-400">With Balances</div>
                <div className="text-2xl font-bold text-white">
                  {isConnected ? Object.keys(balances).length : 'N/A'}
                </div>
              </div>
            </div>

            {/* Token List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTokens.map((token, index) => {
                const balance = isConnected ? getFormattedBalance(token.address) : '0';
                const hasBalance = parseFloat(balance) > 0;
                
                return (
                  <div
                    key={`${token.address}-${index}`}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      token.isNative 
                        ? 'bg-amber-900/20 border-amber-500/30' 
                        : hasBalance 
                          ? 'bg-green-900/20 border-green-500/30'
                          : 'bg-slate-700 border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={token.logoURI}
                        alt={token.symbol}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/tokens/default.png';
                        }}
                      />
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {token.symbol}
                          {token.isNative && (
                            <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded">
                              NATIVE
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400">{token.name}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {token.address.slice(0, 10)}...{token.address.slice(-8)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-white">
                        {isConnected ? balance : 'Not connected'}
                      </div>
                      <div className="text-sm text-slate-400">{token.symbol}</div>
                    </div>
                  </div>
                );
              })}
              
              {filteredTokens.length === 0 && !tokensLoading && (
                <div className="text-center py-8 text-slate-400">
                  <p>No tokens found</p>
                  {searchQuery && (
                    <p className="text-sm mt-1">Try a different search term</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}


        <Card className="mt-6 bg-slate-800 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-300 space-y-2">
              <div><strong>Selected Chain:</strong> {selectedChainId}</div>
              <div><strong>Tokens Loading:</strong> {tokensLoading ? 'Yes' : 'No'}</div>
              <div><strong>Balances Loading:</strong> {balancesLoading ? 'Yes' : 'No'}</div>
              <div><strong>Search Query:</strong> "{searchQuery}"</div>
              <div><strong>Native Tokens Found:</strong> {tokens.filter(t => t.isNative).map(t => t.symbol).join(', ') || 'None'}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
