'use client'

import { ReactNode, useState, useEffect } from 'react'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/config/wagmi.config'

// Import Rainbow Kit styles
import '@rainbow-me/rainbowkit/styles.css'

interface WalletProvidersClientProps {
  children: ReactNode
}

export default function WalletProvidersClient({ children }: WalletProvidersClientProps) {
  const [mounted, setMounted] = useState(false)

  // Create a client for React Query (inside component to avoid SSR issues)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0, // Disable stale time to prevent caching issues
        retry: 1, // Reduce retries
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
    },
    // Disable logger to prevent console errors
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  }))

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Return a loading placeholder during hydration to prevent mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <RainbowKitProvider
          modalSize="compact"
          showRecentTransactions={true}
          initialChain={wagmiConfig.chains[0]}
        >
          {children}
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
