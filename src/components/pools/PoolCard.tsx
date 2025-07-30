'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, User, Wallet, Coins } from 'lucide-react';
import { PoolData } from '@/hooks/usePoolDiscovery';
import { useRouter } from 'next/navigation';
import RemoveLiquidityModal from './RemoveLiquidityModal';

interface TokenIconProps {
  token: {
    symbol: string;
    address: string;
  };
  size?: 'sm' | 'md' | 'lg';
}

function TokenIcon({ token, size = 'md' }: TokenIconProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  if (imageError) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gray-100 flex items-center justify-center border border-gray-200`}>
        <span className="text-xs font-medium text-gray-600">{token.symbol.slice(0, 2)}</span>
      </div>
    );
  }

  // Use KLC logo for wKLC tokens
  const getTokenIconPath = (symbol: string) => {
    const lowerSymbol = symbol.toLowerCase();
    if (lowerSymbol === 'wklc') {
      return '/tokens/klc.png';
    }
    return `/tokens/${lowerSymbol}.png`;
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-600`}>
      <img
        src={getTokenIconPath(token.symbol)}
        alt={token.symbol}
        className="w-full h-full object-cover token-icon"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

interface PoolCardProps {
  pool: PoolData;
  onAddLiquidity?: (pool: PoolData) => void;
}

export default function PoolCard({ pool, onAddLiquidity }: PoolCardProps) {
  const router = useRouter();
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  const handleAddLiquidity = () => {
    if (onAddLiquidity) {
      onAddLiquidity(pool);
    } else {
      // Navigate to add liquidity page with pre-selected tokens
      router.push(`/pools?tokenA=${pool.token0.address}&tokenB=${pool.token1.address}`);
    }
  };

  const formatNumber = (value: string, decimals: number = 2) => {
    const num = parseFloat(value);
    if (num === 0) return '0';
    if (num < 0.01) return '<0.01';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(decimals);
  };

  const formatReserve = (reserve: string, symbol: string) => {
    const formatted = formatNumber(reserve);
    return `${formatted} ${symbol}`;
  };

  return (
    <Card className={`pool-card ${
      pool.userHasPosition ? 'user-position' : ''
    }`}>
      <CardContent className="p-6">
        {/* Pool Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {/* Token Icons */}
            <div className="flex items-center -space-x-2">
              <TokenIcon token={pool.token0} size="md" />
              <TokenIcon token={pool.token1} size="md" />
            </div>

            {/* Pool Name */}
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-lg text-white">
                  {pool.token0.symbol}/{pool.token1.symbol}
                </h3>
                {pool.userHasPosition && (
                  <Badge variant="default" className="text-xs bg-blue-600 text-white">
                    <User className="h-3 w-3 mr-1" />
                    Your Pool
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-300">
                Liquidity Pool
              </p>
            </div>
          </div>
        </div>

        {/* User Position Info */}
        {pool.userHasPosition && (
          <div className="pool-info-card p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Wallet className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Your Position</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {formatNumber(pool.userPoolShare || '0')}% of pool
                </p>
                <p className="text-xs text-gray-300">
                  {formatNumber(pool.userLpBalance || '0')} LP tokens
                </p>
              </div>
            </div>
            {/* User's token amounts */}
            {pool.userToken0Amount && pool.userToken1Amount && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-300">
                  <span>{pool.token0.symbol}:</span>
                  <span>{formatNumber(pool.userToken0Amount)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-300">
                  <span>{pool.token1.symbol}:</span>
                  <span>{formatNumber(pool.userToken1Amount)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pool Info */}
        <div className="pool-info-card p-3 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Coins className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Pool Info</span>
          </div>
          <div className="text-sm text-gray-300">
            <p>Total LP Tokens: {formatNumber(pool.totalSupply)}</p>
          </div>
        </div>

        {/* Pool Composition */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white mb-2">Pool Composition</h4>

          {/* Token 0 */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <TokenIcon token={pool.token0} size="sm" />
              <span className="font-medium text-white">{pool.token0.symbol}</span>
            </div>
            <span className="text-gray-300">
              {formatReserve(pool.reserve0, pool.token0.symbol)}
            </span>
          </div>

          {/* Token 1 */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <TokenIcon token={pool.token1} size="sm" />
              <span className="font-medium text-white">{pool.token1.symbol}</span>
            </div>
            <span className="text-gray-300">
              {formatReserve(pool.reserve1, pool.token1.symbol)}
            </span>
          </div>
        </div>

        {/* Enhanced Subgraph Stats */}
        {pool.txCount && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <div className="text-xs">
              <div>
                <span className="text-gray-400">Transactions</span>
                <div className="text-white font-medium">
                  {formatNumber(pool.txCount, 0)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 pt-4 border-t border-gray-600">
          <div className="flex space-x-2">
            <Button
              onClick={handleAddLiquidity}
              className="flex-1 continue-button"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            {pool.userHasPosition && (
              <Button
                onClick={() => setShowRemoveModal(true)}
                variant="outline"
                className="flex-1 bg-gray-900/30 text-red-400 hover:bg-red-900/30 border-red-500/30"
                size="sm"
              >
                Remove
              </Button>
            )}
          </div>
        </div>

        {/* Pool Address (for debugging) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <a
              href={`https://kalyscan.io/address/${pool.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 font-mono hover:underline transition-colors"
              title={`View ${pool.address} on KalyScan`}
            >
              {pool.address.slice(0, 6)}...{pool.address.slice(-4)}
            </a>
          </div>
        )}

        {/* Remove Liquidity Modal */}
        {pool.userHasPosition && (
          <RemoveLiquidityModal
            isOpen={showRemoveModal}
            onClose={() => setShowRemoveModal(false)}
            pool={pool}
          />
        )}
      </CardContent>
    </Card>
  );
}
