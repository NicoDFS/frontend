// Bridge Context Hook - Adapted from Hyperlane WarpContext
// This hook provides bridge context and state management

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  ChainMap,
  ChainMetadata,
  MultiProtocolProvider,
  WarpCore
} from '@hyperlane-xyz/sdk';
import { bridgeChains } from '../../config/bridge/chains';
import { warpRouteConfigs } from '../../config/bridge/warpRoutes';
import { bridgeConfig } from '../../config/bridge/config';
import { loggerHelpers } from '@/utils/bridge/logger';

// Bridge context interface
export interface BridgeContextType {
  chains: ChainMap<ChainMetadata>;
  multiProvider: MultiProtocolProvider | null;
  warpCore: WarpCore | null;
  isLoading: boolean;
  error: string | null;
  // State management
  selectedOriginChain: string;
  selectedDestinationChain: string;
  selectedTokenIndex: number | null;
  transferAmount: string;
  recipientAddress: string;
  // Actions
  setSelectedOriginChain: (chain: string) => void;
  setSelectedDestinationChain: (chain: string) => void;
  setSelectedTokenIndex: (index: number | null) => void;
  setTransferAmount: (amount: string) => void;
  setRecipientAddress: (address: string) => void;
  swapChains: () => void;
  resetForm: () => void;
}

// Bridge state interface
interface BridgeState {
  chains: ChainMap<ChainMetadata>;
  multiProvider: MultiProtocolProvider | null;
  warpCore: WarpCore | null;
  isLoading: boolean;
  error: string | null;
  selectedOriginChain: string;
  selectedDestinationChain: string;
  selectedTokenIndex: number | null;
  transferAmount: string;
  recipientAddress: string;
}

// Bridge actions
type BridgeAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_BRIDGE_CORE'; payload: { multiProvider: MultiProtocolProvider; warpCore: WarpCore } }
  | { type: 'SET_ORIGIN_CHAIN'; payload: string }
  | { type: 'SET_DESTINATION_CHAIN'; payload: string }
  | { type: 'SET_TOKEN_INDEX'; payload: number | null }
  | { type: 'SET_TRANSFER_AMOUNT'; payload: string }
  | { type: 'SET_RECIPIENT_ADDRESS'; payload: string }
  | { type: 'SWAP_CHAINS' }
  | { type: 'RESET_FORM' };

// Initial state
const initialState: BridgeState = {
  chains: bridgeChains,
  multiProvider: null,
  warpCore: null,
  isLoading: true,
  error: null,
  selectedOriginChain: bridgeConfig.defaultOriginChain,
  selectedDestinationChain: bridgeConfig.defaultDestinationChain,
  selectedTokenIndex: null,
  transferAmount: '',
  recipientAddress: '',
};

// Bridge reducer
function bridgeReducer(state: BridgeState, action: BridgeAction): BridgeState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_BRIDGE_CORE':
      return { 
        ...state, 
        multiProvider: action.payload.multiProvider,
        warpCore: action.payload.warpCore,
        isLoading: false,
        error: null 
      };
    case 'SET_ORIGIN_CHAIN':
      return { 
        ...state, 
        selectedOriginChain: action.payload,
        selectedTokenIndex: null // Reset token selection when chain changes
      };
    case 'SET_DESTINATION_CHAIN':
      return { 
        ...state, 
        selectedDestinationChain: action.payload,
        selectedTokenIndex: null // Reset token selection when chain changes
      };
    case 'SET_TOKEN_INDEX':
      return { ...state, selectedTokenIndex: action.payload };
    case 'SET_TRANSFER_AMOUNT':
      return { ...state, transferAmount: action.payload };
    case 'SET_RECIPIENT_ADDRESS':
      return { ...state, recipientAddress: action.payload };
    case 'SWAP_CHAINS':
      return {
        ...state,
        selectedOriginChain: state.selectedDestinationChain,
        selectedDestinationChain: state.selectedOriginChain,
        selectedTokenIndex: null, // Reset token selection when swapping
        transferAmount: '',
        recipientAddress: '',
      };
    case 'RESET_FORM':
      return {
        ...state,
        selectedTokenIndex: null,
        transferAmount: '',
        recipientAddress: '',
      };
    default:
      return state;
  }
}

// Bridge context
const BridgeContext = createContext<BridgeContextType | null>(null);

// Bridge provider component
export function BridgeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bridgeReducer, initialState);

  // Initialize bridge core on mount
  useEffect(() => {
    const initializeBridge = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        loggerHelpers.bridgeInit('Initializing bridge...');

        // Initialize MultiProtocolProvider with chain configurations
        const multiProvider = new MultiProtocolProvider(bridgeChains);
        loggerHelpers.bridgeInit('MultiProtocolProvider initialized');

        // Initialize WarpCore with warp route configurations
        const warpCore = WarpCore.FromConfig(multiProvider, warpRouteConfigs);
        loggerHelpers.bridgeInit(`WarpCore initialized with ${warpCore.tokens.length} tokens`);

        dispatch({
          type: 'SET_BRIDGE_CORE',
          payload: { multiProvider, warpCore }
        });

        dispatch({ type: 'SET_LOADING', payload: false });
        loggerHelpers.bridgeInit('Bridge initialization complete!');
      } catch (error) {
        loggerHelpers.bridgeInitError('Failed to initialize bridge', error as Error);
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to initialize bridge'
        });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeBridge();
  }, []);

  // Context value
  const contextValue: BridgeContextType = {
    chains: state.chains,
    multiProvider: state.multiProvider,
    warpCore: state.warpCore,
    isLoading: state.isLoading,
    error: state.error,
    selectedOriginChain: state.selectedOriginChain,
    selectedDestinationChain: state.selectedDestinationChain,
    selectedTokenIndex: state.selectedTokenIndex,
    transferAmount: state.transferAmount,
    recipientAddress: state.recipientAddress,
    setSelectedOriginChain: (chain: string) => 
      dispatch({ type: 'SET_ORIGIN_CHAIN', payload: chain }),
    setSelectedDestinationChain: (chain: string) => 
      dispatch({ type: 'SET_DESTINATION_CHAIN', payload: chain }),
    setSelectedTokenIndex: (index: number | null) => 
      dispatch({ type: 'SET_TOKEN_INDEX', payload: index }),
    setTransferAmount: (amount: string) => 
      dispatch({ type: 'SET_TRANSFER_AMOUNT', payload: amount }),
    setRecipientAddress: (address: string) => 
      dispatch({ type: 'SET_RECIPIENT_ADDRESS', payload: address }),
    swapChains: () => dispatch({ type: 'SWAP_CHAINS' }),
    resetForm: () => dispatch({ type: 'RESET_FORM' }),
  };

  return (
    <BridgeContext.Provider value={contextValue}>
      {children}
    </BridgeContext.Provider>
  );
}

// Hook to use bridge context
export function useBridgeContext(): BridgeContextType {
  const context = useContext(BridgeContext);
  if (!context) {
    throw new Error('useBridgeContext must be used within a BridgeProvider');
  }
  return context;
}
