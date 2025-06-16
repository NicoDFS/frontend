import { useState, useEffect, useCallback } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain, useSendTransaction } from 'wagmi'
import { kalychain, isSupportedChain, type ChainId } from '@/config/chains'

// Utility function to convert Hyperlane transaction to wagmi format
function hyperlaneToWagmiTx(tx: any) {
  console.log('🔍 Converting transaction:', tx);

  // Handle different transaction structures
  const transaction = tx.transaction || tx;

  if (!transaction.to) {
    console.error('❌ Transaction missing "to" field:', transaction);
    throw new Error('No tx recipient address specified');
  }

  // Convert BigNumber values to bigint if needed
  const convertToBigInt = (value: any) => {
    if (!value) return BigInt(0);
    if (typeof value === 'bigint') return value;
    if (typeof value === 'string') return BigInt(value);
    if (value._hex) return BigInt(value._hex); // Ethers BigNumber
    if (value.toString) return BigInt(value.toString());
    return BigInt(value);
  };

  const wagmiTx = {
    to: transaction.to as `0x${string}`,
    value: convertToBigInt(transaction.value),
    data: (transaction.data || '0x') as `0x${string}`,
    gas: transaction.gasLimit ? convertToBigInt(transaction.gasLimit) : undefined,
    gasPrice: transaction.gasPrice ? convertToBigInt(transaction.gasPrice) : undefined,
    maxFeePerGas: transaction.maxFeePerGas ? convertToBigInt(transaction.maxFeePerGas) : undefined,
    maxPriorityFeePerGas: transaction.maxPriorityFeePerGas ? convertToBigInt(transaction.maxPriorityFeePerGas) : undefined,
  };

  console.log('✅ Converted transaction:', wagmiTx);
  return wagmiTx;
}

// Wallet types
export type WalletType = 'external' | 'internal'

// Internal wallet interface (from existing system)
interface InternalWallet {
  id: string
  address: string
  chainId: number
}

// Unified wallet state
interface WalletState {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean
  
  // Wallet info
  address?: string
  chainId?: number
  walletType?: WalletType
  
  // Balance
  balance?: {
    value: bigint
    decimals: number
    formatted: string
    symbol: string
  }
  
  // Internal wallet specific
  internalWallet?: InternalWallet
}

// Unified wallet actions
interface WalletActions {
  // Connection
  connect: (walletType: WalletType) => Promise<void>
  disconnect: () => void

  // Chain management
  switchChain: (chainId: ChainId) => Promise<void>

  // Transaction signing
  signTransaction: (transaction: any) => Promise<string>

  // Internal wallet management
  switchToInternalWallet: (walletId: string) => Promise<void>
  getInternalWallets: () => Promise<InternalWallet[]>
}

export function useWallet(): WalletState & WalletActions {
  // Rainbow Kit / Wagmi hooks - with error handling for missing provider
  let externalAddress: string | undefined
  let isExternalConnected = false
  let isConnecting = false
  let isReconnecting = false
  let connectExternal: any
  let connectors: any[] = []
  let disconnectExternal: any
  let chainId: number | undefined
  let switchChain: any
  let sendTransaction: any

  try {
    const accountData = useAccount()
    const connectData = useConnect()
    const disconnectData = useDisconnect()
    const chainData = useChainId()
    const switchChainData = useSwitchChain()
    const sendTransactionData = useSendTransaction()

    externalAddress = accountData.address
    isExternalConnected = accountData.isConnected
    isConnecting = accountData.isConnecting
    isReconnecting = accountData.isReconnecting
    connectExternal = connectData.connect
    connectors = connectData.connectors
    disconnectExternal = disconnectData.disconnect
    chainId = chainData
    switchChain = switchChainData.switchChain
    sendTransaction = sendTransactionData.sendTransactionAsync
  } catch (error) {
    // Wagmi hooks not available - fallback to internal wallet only
    // Log warning only once and not during render
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      setTimeout(() => {
        console.warn('Wagmi provider not found, using internal wallet only')
      }, 0)
    }
  }

  // External wallet balance - with error handling
  let externalBalance: any
  try {
    const balanceData = useBalance({
      address: externalAddress,
      query: {
        enabled: !!externalAddress && isExternalConnected,
      },
    })
    externalBalance = balanceData.data
  } catch (error) {
    // Balance hook not available
    externalBalance = undefined
  }
  
  // Internal wallet state
  const [internalWallet, setInternalWallet] = useState<InternalWallet | null>(null)
  const [walletType, setWalletType] = useState<WalletType | undefined>()
  
  // Determine current wallet state
  const isConnected = isExternalConnected || !!internalWallet
  const currentAddress = externalAddress || internalWallet?.address
  const currentChainId = chainId || internalWallet?.chainId
  
  // Get current balance (external or internal)
  const currentBalance = externalBalance || undefined // TODO: Add internal wallet balance fetching
  
  // Load internal wallet from localStorage on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('active_internal_wallet')
    if (savedWallet) {
      try {
        const wallet = JSON.parse(savedWallet)
        setInternalWallet(wallet)
        setWalletType('internal')
      } catch (error) {
        console.error('Error loading internal wallet:', error)
        localStorage.removeItem('active_internal_wallet')
      }
    }
  }, [])
  
  // Update wallet type when external wallet connects/disconnects
  useEffect(() => {
    if (isExternalConnected && externalAddress) {
      setWalletType('external')
      // Clear internal wallet when external connects
      setInternalWallet(null)
      localStorage.removeItem('active_internal_wallet')
    } else if (!isExternalConnected && !internalWallet) {
      setWalletType(undefined)
    }
  }, [isExternalConnected, externalAddress, internalWallet])
  
  // Connect function
  const connect = useCallback(async (type: WalletType) => {
    if (type === 'external') {
      // Use the first available connector (usually MetaMask)
      const connector = connectors[0]
      if (connector && connectExternal) {
        await connectExternal({ connector })
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('External wallet connection not available')
        }
      }
    } else if (type === 'internal') {
      // Show internal wallet selection modal
      // This will be implemented when we integrate with existing internal wallet system
      if (process.env.NODE_ENV === 'development') {
        console.log('Internal wallet connection - to be implemented')
      }
    }
  }, [connectExternal, connectors])
  
  // Disconnect function
  const disconnect = useCallback(() => {
    if (walletType === 'external' && disconnectExternal) {
      disconnectExternal()
    } else if (walletType === 'internal') {
      setInternalWallet(null)
      localStorage.removeItem('active_internal_wallet')
    }
    setWalletType(undefined)
  }, [walletType, disconnectExternal])
  
  // Switch chain function
  const handleSwitchChain = useCallback(async (targetChainId: ChainId) => {
    if (!isSupportedChain(targetChainId)) {
      throw new Error(`Chain ${targetChainId} is not supported`)
    }

    if (walletType === 'external' && switchChain) {
      await switchChain({ chainId: targetChainId })
    } else if (walletType === 'internal') {
      // Update internal wallet chain
      if (internalWallet) {
        const updatedWallet = { ...internalWallet, chainId: targetChainId }
        setInternalWallet(updatedWallet)
        localStorage.setItem('active_internal_wallet', JSON.stringify(updatedWallet))
      }
    }
  }, [walletType, switchChain, internalWallet])
  
  // Switch to internal wallet
  const switchToInternalWallet = useCallback(async (walletId: string) => {
    // Disconnect external wallet first
    if (isExternalConnected && disconnectExternal) {
      disconnectExternal()
    }

    // TODO: Fetch internal wallet details from API
    // For now, simulate the wallet data
    const wallet: InternalWallet = {
      id: walletId,
      address: '0x...', // Get from API
      chainId: kalychain.id,
    }

    setInternalWallet(wallet)
    setWalletType('internal')
    localStorage.setItem('active_internal_wallet', JSON.stringify(wallet))
  }, [isExternalConnected, disconnectExternal])
  
  // Sign transaction
  const signTransaction = useCallback(async (transaction: any): Promise<string> => {
    if (walletType === 'external') {
      if (!sendTransaction) {
        throw new Error('External wallet not available for transaction signing');
      }

      try {
        console.log('🔐 Signing transaction with external wallet:', {
          type: typeof transaction,
          keys: Object.keys(transaction || {}),
          transaction
        });

        // Convert Hyperlane transaction to wagmi format
        const wagmiTx = hyperlaneToWagmiTx(transaction);

        console.log('📝 Converted transaction:', wagmiTx);

        // Send transaction using wagmi
        console.log('📤 Sending transaction with wagmi...');
        const result = await sendTransaction(wagmiTx);

        console.log('📥 Transaction result:', result);
        console.log('📥 Transaction result type:', typeof result);

        if (!result) {
          throw new Error('Transaction hash not returned from wallet');
        }

        // The result should be the transaction hash
        const hash = typeof result === 'string' ? result : result.hash || result;
        console.log('✅ Final transaction hash:', hash);

        return hash;
      } catch (error) {
        console.error('❌ External wallet transaction failed:', error);
        throw error;
      }
    } else if (walletType === 'internal') {
      // For internal wallets, use the existing internal wallet system
      // This is a placeholder - actual implementation would call the internal wallet API
      throw new Error('Internal wallet transaction signing not implemented yet')
    } else {
      throw new Error('No wallet connected')
    }
  }, [walletType, sendTransaction])

  // Get internal wallets
  const getInternalWallets = useCallback(async (): Promise<InternalWallet[]> => {
    // TODO: Fetch from API
    // For now, return empty array
    return []
  }, [])
  
  return {
    // State
    isConnected,
    isConnecting,
    isReconnecting,
    address: currentAddress,
    chainId: currentChainId,
    walletType,
    balance: currentBalance,
    internalWallet: internalWallet || undefined,
    
    // Actions
    connect,
    disconnect,
    switchChain: handleSwitchChain,
    signTransaction,
    switchToInternalWallet,
    getInternalWallets,
  }
}
