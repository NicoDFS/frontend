'use client';

import React from 'react';
import SwapInterface from './SwapInterface';
import SwapHistory from './SwapHistory';
import { useAccount } from 'wagmi';

interface SwapWithHistoryProps {
  className?: string;
}

export default function SwapWithHistory({ className = '' }: SwapWithHistoryProps) {
  const { address } = useAccount();

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      {/* Swap Interface */}
      <div className="flex justify-center lg:justify-end">
        <SwapInterface />
      </div>
      
      {/* Transaction History */}
      <div className="flex justify-center lg:justify-start">
        <div className="w-full max-w-2xl">
          <SwapHistory />
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for smaller screens or sidebar
 */
export function CompactSwapWithHistory({ className = '' }: SwapWithHistoryProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Swap Interface */}
      <div className="flex justify-center">
        <SwapInterface />
      </div>
      
      {/* Compact Transaction History */}
      <SwapHistory compact maxItems={5} />
    </div>
  );
}
