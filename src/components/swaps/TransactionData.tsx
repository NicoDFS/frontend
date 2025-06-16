'use client';

import { useState, useEffect } from 'react';
import { useDexData, type DexTransaction } from '@/hooks/useDexData';
import { useExplorerTransactions, type ExplorerTransaction } from '@/hooks/useExplorerTransactions';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  ArrowUpDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';

// Use DexTransaction from the hook

interface TransactionDataProps {
  selectedPair?: {
    token0Symbol: string;
    token1Symbol: string;
    pairAddress?: string;
  };
  userAddress?: string | null;
}

export default function TransactionData({ selectedPair, userAddress }: TransactionDataProps) {
  const [activeTab, setActiveTab] = useState<'recent' | 'my'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Use the Explorer API instead of DEX subgraph
  const {
    transactions,
    loading,
    error,
    refetch
  } = useExplorerTransactions({
    userAddress: activeTab === 'my' ? userAddress : null,
    limit: itemsPerPage * 5 // Get more transactions since we'll paginate client-side
  });

  // Client-side pagination for explorer transactions
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);
  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  // Reset page when switching tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  // Format address
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get transaction type display for explorer transactions
  const getTransactionTypeDisplay = (tx: ExplorerTransaction) => {
    switch (tx.type) {
      case 'KLC_SWAP':
        return 'KLC Swap';
      case 'TOKEN_SWAP':
        return 'Token Swap';
      default:
        return 'Swap';
    }
  };

  // Format KLC amount
  const formatKlcAmount = (value?: string) => {
    if (!value || value === '0') return '0';
    return (parseFloat(value) / 1e18).toFixed(4);
  };

  // Get transaction value display
  const getTransactionValue = (tx: ExplorerTransaction) => {
    if (tx.tokenPair) {
      return `${tx.tokenPair.token0} ↔ ${tx.tokenPair.token1}`;
    } else if (tx.type === 'KLC_SWAP' && tx.klcValue) {
      return `KLC ↔ Token (${formatKlcAmount(tx.klcValue)} KLC)`;
    } else if (tx.type === 'TOKEN_SWAP') {
      return 'Token ↔ Token';
    } else {
      return 'Swap Transaction';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'recent' | 'my')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recent">Recent Trades</TabsTrigger>
            <TabsTrigger value="my" disabled={!userAddress}>
              My Trades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="mt-6">
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading transactions...</span>
                </div>
              ) : paginatedTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No recent transactions found</p>
                  {selectedPair && (
                    <p className="text-sm mt-1">
                      for {selectedPair.token0Symbol}/{selectedPair.token1Symbol} pair
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium">
                            {getTransactionTypeDisplay(tx)}
                          </TableCell>
                          <TableCell>
                            {getTransactionValue(tx)}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              tx.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {tx.status === 'success' ? 'Success' : 'Failed'}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatAddress(tx.from)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatTime(tx.timestamp.toISOString())}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://kalyscan.io/tx/${tx.hash}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="my" className="mt-6">
            <div className="space-y-4">
              {!userAddress ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Connect your wallet to view your transaction history</p>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading your transactions...</span>
                </div>
              ) : paginatedTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No transactions found for your account</p>
                  {selectedPair && (
                    <p className="text-sm mt-1">
                      for {selectedPair.token0Symbol}/{selectedPair.token1Symbol} pair
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium">
                            {getTransactionTypeDisplay(tx)}
                          </TableCell>
                          <TableCell>
                            {getTransactionValue(tx)}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              tx.status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {tx.status === 'success' ? 'Success' : 'Failed'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatTime(tx.timestamp.toISOString())}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://kalyscan.io/tx/${tx.hash}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
