'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';

// Dynamically import SwapInterface to prevent SSR issues with Wagmi
const SwapInterface = dynamic(
  () => import('./SwapInterface').catch(() => {
    // Fallback component if import fails
    return {
      default: () => (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8 text-red-600">
              <span>Error loading swap interface. Please refresh the page.</span>
            </div>
          </CardContent>
        </Card>
      )
    };
  }),
  {
    ssr: false,
    loading: () => (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading swap interface...</span>
          </div>
        </CardContent>
      </Card>
    )
  }
);

export default function SwapInterfaceWrapper() {
  return <SwapInterface />;
}
