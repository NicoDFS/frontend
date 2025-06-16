'use client'

import { ReactNode, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

interface WalletProvidersProps {
  children: ReactNode
}

// Dynamically import the actual providers to prevent SSR issues
const DynamicWalletProviders = dynamic(
  () => import('./WalletProvidersClient'),
  {
    ssr: false,
    loading: () => <div>Loading wallet providers...</div>
  }
)

export function WalletProviders({ children }: WalletProvidersProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <DynamicWalletProviders>
      {children}
    </DynamicWalletProviders>
  )
}
