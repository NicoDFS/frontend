'use client'

import { useAccount, useConnect } from 'wagmi'
import { useWallet } from '@/hooks/useWallet'
import { internalWalletUtils } from '@/connectors/internalWallet'
import { useState, useEffect } from 'react'

export function WalletDebug() {
  const wagmiAccount = useAccount()
  const { connectors } = useConnect()
  const wallet = useWallet()
  const [internalState, setInternalState] = useState(internalWalletUtils.getState())

  useEffect(() => {
    const handleStateChange = () => {
      setInternalState(internalWalletUtils.getState())
    }

    internalWalletUtils.addEventListener('connect', handleStateChange)
    internalWalletUtils.addEventListener('disconnect', handleStateChange)
    internalWalletUtils.addEventListener('accountsChanged', handleStateChange)

    return () => {
      internalWalletUtils.removeEventListener('connect', handleStateChange)
      internalWalletUtils.removeEventListener('disconnect', handleStateChange)
      internalWalletUtils.removeEventListener('accountsChanged', handleStateChange)
    }
  }, [])

  return (
    <div className="p-4 bg-gray-100 rounded-lg space-y-4">
      <h3 className="font-bold text-lg">Wallet Debug Info</h3>
      
      <div className="space-y-2">
        <h4 className="font-semibold">Wagmi Account:</h4>
        <pre className="text-xs bg-white p-2 rounded overflow-auto">
          {JSON.stringify({
            address: wagmiAccount.address,
            isConnected: wagmiAccount.isConnected,
            isConnecting: wagmiAccount.isConnecting,
            isReconnecting: wagmiAccount.isReconnecting,
            connector: wagmiAccount.connector ? {
              id: wagmiAccount.connector.id,
              name: wagmiAccount.connector.name,
              type: wagmiAccount.connector.type
            } : null,
            chainId: wagmiAccount.chainId,
            status: wagmiAccount.status
          }, null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Available Connectors:</h4>
        <pre className="text-xs bg-white p-2 rounded overflow-auto">
          {JSON.stringify(connectors.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type
          })), null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">useWallet Hook:</h4>
        <pre className="text-xs bg-white p-2 rounded overflow-auto">
          {JSON.stringify({
            isConnected: wallet.isConnected,
            address: wallet.address,
            chainId: wallet.chainId,
            walletType: wallet.walletType,
            isConnecting: wallet.isConnecting,
            isReconnecting: wallet.isReconnecting
          }, null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Internal Wallet State:</h4>
        <pre className="text-xs bg-white p-2 rounded overflow-auto">
          {JSON.stringify(internalState, null, 2)}
        </pre>
      </div>
    </div>
  )
}
