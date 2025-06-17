'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useSwapTransactions, type SwapTransaction } from '@/hooks/useSwapTransactions';
import { useDexData, type DexTransaction } from '@/hooks/useDexData';
import { useExplorerTransactions, type ExplorerTransaction } from '@/hooks/useExplorerTransactions';
import { useAccount } from 'wagmi';

interface SwapHistoryProps {
  className?: string;
  compact?: boolean;
  maxItems?: number;
}

export default function SwapHistory({
  className = '',
  compact = false,
  maxItems = 10
}: SwapHistoryProps) {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'recent' | 'my'>('recent');

  // Debug logging
  useEffect(() => {
    console.log('SwapHistory - Wallet status:', { address, isConnected, activeTab });
  }, [address, isConnected, activeTab]);

  // Use Explorer API for recent trades (all trades)
  const {
    transactions: recentTransactions,
    loading: recentLoading,
    error: recentError,
    refetch: refetchRecent
  } = useExplorerTransactions({
    limit: maxItems
  });

  // Use Explorer API for user-specific trades when wallet is connected
  const {
    transactions: userExplorerTransactions,
    loading: userExplorerLoading,
    error: userExplorerError,
    refetch: refetchUserExplorer
  } = useExplorerTransactions({
    userAddress: isConnected ? address : undefined,
    limit: maxItems
  });

  // Use swap transactions for pending/new user transactions
  const {
    transactions: userSwapTransactions,
    loading: userSwapLoading,
    error: userSwapError,
    getFilteredTransactions,
    pendingCount
  } = useSwapTransactions({
    userAddress: address,
    autoRefresh: true,
    refreshInterval: 15000
  });

  // Combine user transactions from both sources for "My Trades"
  const combinedUserTransactions = [
    ...getFilteredTransactions('all'),
    ...userExplorerTransactions
  ].sort((a, b) => {
    // Both SwapTransaction and ExplorerTransaction have timestamp as Date objects
    const aTime = a.timestamp.getTime();
    const bTime = b.timestamp.getTime();
    return bTime - aTime;
  }).slice(0, maxItems);

  // Get transactions based on active tab
  const displayTransactions = activeTab === 'recent'
    ? recentTransactions.slice(0, maxItems)
    : combinedUserTransactions;

  const loading = activeTab === 'recent' ? recentLoading : (userExplorerLoading || userSwapLoading);
  const error = activeTab === 'recent' ? recentError : (userExplorerError || userSwapError);
  const refetch = activeTab === 'recent' ? refetchRecent : () => {
    refetchUserExplorer();
    // Note: useSwapTransactions auto-refreshes, no manual fetch needed
  };

  // Format time display
  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  // Format amount display
  const formatAmount = (amount: string, decimals: number = 18) => {
    const num = parseFloat(amount);
    if (num === 0) return '0';
    if (num < 0.0001) return '<0.0001';
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    if (num < 1000000) return `${(num / 1000).toFixed(2)}K`;
    return `${(num / 1000000).toFixed(2)}M`;
  };

  // Get status icon and color
  const getStatusDisplay = (status: SwapTransaction['status']) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          color: 'bg-yellow-100 text-yellow-800',
          label: 'Pending'
        };
      case 'confirmed':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          color: 'bg-green-100 text-green-800',
          label: 'Confirmed'
        };
      case 'failed':
        return {
          icon: <XCircle className="h-3 w-3" />,
          color: 'bg-red-100 text-red-800',
          label: 'Failed'
        };
      default:
        return {
          icon: <Clock className="h-3 w-3" />,
          color: 'bg-gray-100 text-gray-800',
          label: 'Unknown'
        };
    }
  };

  // Convert DexTransaction to unified format
  const convertDexTransaction = (tx: DexTransaction): SwapTransaction => ({
    id: tx.id,
    hash: tx.hash,
    status: 'confirmed' as const, // DEX transactions are already confirmed
    type: 'SWAP' as const,
    fromToken: {
      symbol: tx.token0Symbol,
      address: '0x0', // Not available in DexTransaction
      decimals: 18,
    },
    toToken: {
      symbol: tx.token1Symbol,
      address: '0x0', // Not available in DexTransaction
      decimals: 18,
    },
    fromAmount: tx.token0Amount,
    toAmount: tx.token1Amount,
    fromAmountFormatted: tx.token0Amount,
    toAmountFormatted: tx.token1Amount,
    slippage: '0.5',
    timestamp: new Date(tx.timestamp),
    userAddress: tx.sender,
    explorerUrl: `https://kalyscan.io/tx/${tx.hash}`
  });

  // Convert ExplorerTransaction to unified format
  const convertExplorerTransaction = (tx: ExplorerTransaction): SwapTransaction => ({
    id: tx.id,
    hash: tx.hash,
    status: tx.status === 'success' ? 'confirmed' as const : 'failed' as const,
    type: 'SWAP' as const,
    fromToken: {
      symbol: tx.type === 'KLC_SWAP' ? 'KLC' : 'TOKEN',
      address: '0x0',
      decimals: 18,
    },
    toToken: {
      symbol: tx.type === 'KLC_SWAP' ? 'TOKEN' : 'KLC',
      address: '0x0',
      decimals: 18,
    },
    fromAmount: tx.klcValue || '0',
    toAmount: '0',
    fromAmountFormatted: tx.klcValue || '0',
    toAmountFormatted: '0',
    slippage: '0.5',
    timestamp: tx.timestamp,
    userAddress: tx.from,
    explorerUrl: `https://kalyscan.io/tx/${tx.hash}`
  });

  // Transaction row component
  const TransactionRow = ({ transaction }: { transaction: SwapTransaction | DexTransaction | ExplorerTransaction }) => {
    // Convert to unified SwapTransaction format
    let unifiedTransaction: SwapTransaction;

    if ('fromToken' in transaction) {
      // Already a SwapTransaction
      unifiedTransaction = transaction as SwapTransaction;
    } else if ('token0Symbol' in transaction) {
      // DexTransaction
      unifiedTransaction = convertDexTransaction(transaction as DexTransaction);
    } else {
      // ExplorerTransaction
      unifiedTransaction = convertExplorerTransaction(transaction as ExplorerTransaction);
    }

    const statusDisplay = getStatusDisplay(unifiedTransaction.status);

    // Check if this is an explorer transaction (simplified display)
    const isExplorerTransaction = !('token0Symbol' in transaction) && !('fromToken' in transaction);
    const explorerTx = isExplorerTransaction ? transaction as ExplorerTransaction : null;

    return (
      <div className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
        <div className="flex items-center gap-3 flex-1">
          {/* Transaction type icon */}
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-blue-600" />
            </div>
          </div>

          {/* Transaction details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {explorerTx ? (
                  explorerTx.tokenPair ?
                    `${explorerTx.tokenPair.token0} ↔ ${explorerTx.tokenPair.token1}` :
                  explorerTx.type === 'KLC_SWAP' ? (
                    explorerTx.klcValue ?
                      `KLC ↔ Token (${(parseFloat(explorerTx.klcValue) / 1e18).toFixed(4)} KLC)` :
                      'KLC ↔ Token'
                  ) :
                  explorerTx.type === 'TOKEN_SWAP' ? 'Token ↔ Token' : 'Swap Transaction'
                ) : (
                  `${formatAmount(unifiedTransaction.fromAmountFormatted)} ${unifiedTransaction.fromToken.symbol} → ${formatAmount(unifiedTransaction.toAmountFormatted)} ${unifiedTransaction.toToken.symbol}`
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={`text-xs ${statusDisplay.color}`}>
                <span className="flex items-center gap-1">
                  {statusDisplay.icon}
                  {statusDisplay.label}
                </span>
              </Badge>
              <span className="text-xs text-gray-500">
                {formatTime(unifiedTransaction.timestamp)}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              From: {unifiedTransaction.userAddress.slice(0, 6)}...{unifiedTransaction.userAddress.slice(-4)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(unifiedTransaction.explorerUrl, '_blank')}
            className="h-8 w-8 p-0"
            title="View on KalyScan"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Compact view for sidebar
  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Recent Swaps</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {pendingCount > 0 && (
            <div className="text-xs text-yellow-600">
              {pendingCount} pending transaction{pendingCount > 1 ? 's' : ''}
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {loading && displayTransactions.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          ) : displayTransactions.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No recent swaps</p>
            </div>
          ) : (
            <div className="space-y-0">
              {displayTransactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full view with tabs
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Swap History</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'recent' | 'my')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recent">Recent Trades</TabsTrigger>
            <TabsTrigger value="my">
              My Trades
              {isConnected && pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="mt-4">
            {loading && displayTransactions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading recent trades...</span>
              </div>
            ) : displayTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recent trades found</p>
                <p className="text-sm mt-1">Trades from the last 24 hours will appear here</p>
              </div>
            ) : (
              <div className="border rounded-lg" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                {displayTransactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my" className="mt-4">
            {!isConnected ? (
              <div className="text-center py-8 text-gray-500">
                <p>Connect your wallet to view your transaction history</p>
              </div>
            ) : loading && displayTransactions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading your trades...</span>
              </div>
            ) : displayTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No transactions found</p>
                <p className="text-sm mt-1">Your swap history will appear here</p>
              </div>
            ) : (
              <div className="border rounded-lg" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                {displayTransactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border rounded-lg" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
