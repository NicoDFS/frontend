'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { internalWalletUtils } from '@/connectors/internalWallet'
import { useEffect, useState } from 'react'

export default function InternalWalletStatus() {
  const { address, isConnected, connector } = useAccount()
  const { disconnect } = useDisconnect()
  const [internalWalletState, setInternalWalletState] = useState(internalWalletUtils.getState())

  useEffect(() => {
    const handleStateChange = () => {
      setInternalWalletState(internalWalletUtils.getState())
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

  // Only show if connected with internal wallet
  if (!isConnected || connector?.id !== 'kalyswap-internal') {
    return null
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-blue-900">KalySwap Internal Wallet Connected</h3>
          <p className="text-sm text-blue-700">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
          {internalWalletState.availableWallets.length > 1 && (
            <p className="text-xs text-blue-600 mt-1">
              {internalWalletState.availableWallets.length} wallets available
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {internalWalletState.availableWallets.length > 1 && (
            <button
              onClick={() => {
                // Show wallet selection
                const walletOptions = internalWalletState.availableWallets
                  .filter(w => w.address !== address)
                  .map(w => ({ 
                    label: `${w.address.slice(0, 6)}...${w.address.slice(-4)}`, 
                    value: w.id 
                  }))
                
                if (walletOptions.length > 0) {
                  // Simple selection for now - in production, show a proper modal
                  const selection = prompt(`Select wallet:\n${walletOptions.map((w, i) => `${i + 1}. ${w.label}`).join('\n')}`)
                  const index = parseInt(selection || '0') - 1
                  if (index >= 0 && index < walletOptions.length) {
                    internalWalletUtils.selectWallet(walletOptions[index].value)
                  }
                }
              }}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Switch
            </button>
          )}
          <button
            onClick={() => disconnect()}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  )
}
