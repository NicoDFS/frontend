'use client'

import { ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/config/wagmi.config'
import { useHydration } from '@/hooks/useHydration'

// Import Rainbow Kit styles
import '@rainbow-me/rainbowkit/styles.css'

interface WalletProvidersClientProps {
  children: ReactNode
}

// Create QueryClient outside component to prevent recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
  logger: {
    log: () => {},
    warn: () => {},
    error: () => {},
  },
})

function WalletProvidersClient({ children }: WalletProvidersClientProps) {
  const isHydrated = useHydration()

  // Return children without wallet providers during SSR
  if (!isHydrated) {
    return <>{children}</>
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

export default WalletProvidersClient
