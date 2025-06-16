'use client'

import { ReactNode } from 'react'
import dynamic from 'next/dynamic'

interface WalletProvidersProps {
  children: ReactNode
}

// Dynamically import the actual providers to prevent SSR issues
const DynamicWalletProviders = dynamic(
  () => import('./WalletProvidersClient'),
  {
    ssr: false,
    loading: () => null // Return null instead of loading text to prevent layout shift
  }
)

export function WalletProviders({ children }: WalletProvidersProps) {
  return (
    <DynamicWalletProviders>
      {children}
    </DynamicWalletProviders>
  )
}
