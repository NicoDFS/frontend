'use client'

import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useConnect, useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useWallet } from '@/hooks/useWallet'
import { Wallet, ExternalLink, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { internalWalletConnector } from '@/connectors/internalWallet'

interface ConnectWalletProps {
  children?: React.ReactNode
  className?: string
}

export function ConnectWallet({ children, className }: ConnectWalletProps) {
  const { isConnected, walletType, address, chainId } = useWallet()
  const [showWalletModal, setShowWalletModal] = useState(false)
  const { connect, connectors } = useConnect()
  const router = useRouter()

  // DEBUG: Log available connectors (only in development and not during render)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Available connectors:', connectors.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type
      })))
      console.log('Internal connector available:', !!internalWalletConnector)
    }
  }, [connectors])

  // Custom Connect Button approach - more reliable than trying to integrate with Rainbow Kit modal
  return (
    <div className={className}>
      {isConnected ? (
        // Show connected state with Rainbow Kit button
        <div className="flex items-center gap-2">
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />
          {walletType && (
            <Badge
              variant={walletType === 'external' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {walletType === 'external' ? 'External' : 'Internal'}
            </Badge>
          )}
        </div>
      ) : (
        // Show custom connect options when not connected
        <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
          <DialogTrigger asChild>
            {children || (
              <Button variant="outline" size="sm">
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
            )}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Connect Your Wallet
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* External Wallets Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    External Wallets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Connect your existing wallet (MetaMask, WalletConnect, etc.)
                  </p>
                  <ConnectButton.Custom>
                    {({ openConnectModal, connectModalOpen }) => (
                      <Button
                        onClick={() => {
                          setShowWalletModal(false)
                          setTimeout(() => openConnectModal(), 100)
                        }}
                        className="w-full"
                        disabled={connectModalOpen}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Connect External Wallet
                      </Button>
                    )}
                  </ConnectButton.Custom>
                </CardContent>
              </Card>

              {/* Internal Wallets Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    KalySwap Wallets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Use your KalySwap internal wallet or create a new one
                  </p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        try {
                          // Use our internal wallet connector directly
                          await connect({ connector: internalWalletConnector })
                          setShowWalletModal(false)
                        } catch (error) {
                          console.error('Failed to connect internal wallet:', error)
                          alert(error instanceof Error ? error.message : 'Failed to connect internal wallet')
                        }
                      }}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Use Internal Wallet
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-sm"
                      onClick={() => {
                        setShowWalletModal(false)
                        router.push('/dashboard')
                      }}
                    >
                      Create New Wallet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )

  // Custom modal approach temporarily removed for pure Rainbow Kit testing
}

// Simplified version for navigation with error boundary
export function ConnectWalletButton({ className }: { className?: string }) {
  try {
    return (
      <ConnectWallet className={className}>
        <Button variant="outline" size="sm">
          <Wallet className="h-4 w-4 mr-2" />
          Connect
        </Button>
      </ConnectWallet>
    )
  } catch (error) {
    // Fallback if wallet providers are not available
    return (
      <Button variant="outline" size="sm" className={className} disabled>
        <Wallet className="h-4 w-4 mr-2" />
        Connect
      </Button>
    )
  }
}

// Wallet info display component
export function WalletInfo() {
  const { isConnected, address, chainId, walletType, balance } = useWallet()

  if (!isConnected) {
    return null
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Connected Wallet
          </span>
          <Badge variant={walletType === 'external' ? 'default' : 'secondary'}>
            {walletType === 'external' ? 'External' : 'Internal'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Address</p>
          <p className="font-mono text-sm">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
          </p>
        </div>
        
        <div>
          <p className="text-xs text-gray-500 mb-1">Network</p>
          <p className="text-sm">
            {chainId === 3888 ? 'KalyChain' : `Chain ${chainId}`}
          </p>
        </div>
        
        {balance && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Balance</p>
            <p className="text-sm font-medium">
              {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
