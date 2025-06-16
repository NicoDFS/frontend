'use client';

import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import PoolListWrapper from '@/components/pools/PoolListWrapper';
import { PoolData } from '@/hooks/usePoolDiscovery';

export default function BrowsePoolsPage() {
  const router = useRouter();

  const handleAddLiquidity = (pool: PoolData) => {
    // Navigate to add liquidity page with pre-selected tokens
    const params = new URLSearchParams({
      tokenA: pool.token0.address,
      tokenB: pool.token1.address,
      tokenASymbol: pool.token0.symbol,
      tokenBSymbol: pool.token1.symbol
    });

    router.push(`/pools?${params.toString()}`);
  };

  return (
    <MainLayout>
      <div className="min-h-screen pools-container">
        <PoolListWrapper onAddLiquidity={handleAddLiquidity} />
      </div>
    </MainLayout>
  );
}
