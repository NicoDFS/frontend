'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTokenLists } from '@/hooks/useTokenLists';
import MainLayout from '@/components/layout/MainLayout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpDown,
  Clock,
  ShoppingCart,
  Send
} from 'lucide-react';
import TradingChart from '@/components/charts/TradingChart';
import TransactionData from '@/components/swaps/TransactionData';
import SwapInterfaceWrapper from '@/components/swap/SwapInterfaceWrapper';
import { formatTokenPrice, formatPriceChange } from '@/hooks/usePriceData';
import { usePairMarketStats } from '@/hooks/usePairMarketStats';
import { useWallet } from '@/hooks/useWallet';
import { PriceDataProvider } from '@/contexts/PriceDataContext';
import { useChainId } from 'wagmi';
import { useHydration } from '@/hooks/useHydration';
import './swaps.css';

// Token interface based on KalyChain official tokenlist
interface Token {
  chainId: number;
  address: string;
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  balance?: string;
  isNative?: boolean;
}

// Official KalyChain tokens from https://raw.githubusercontent.com/KalyCoinProject/tokenlists/main/kalyswap.tokenlist.json
const KALYCHAIN_TOKENS: Token[] = [
  // Add native KLC as first option
  {
    chainId: 3888,
    address: '0x0000000000000000000000000000000000000000', // Native token
    decimals: 18,
    name: 'KalyCoin',
    symbol: 'KLC',
    logoURI: 'https://raw.githubusercontent.com/kalycoinproject/tokens/main/assets/3888/0x069255299Bb729399f3CECaBdc73d15d3D10a2A3/logo_24.png',
    isNative: true
  },
  {
    chainId: 3888,
    address: '0x069255299Bb729399f3CECaBdc73d15d3D10a2A3',
    decimals: 18,
    name: 'Wrapped KalyCoin',
    symbol: 'wKLC',
    logoURI: 'https://raw.githubusercontent.com/kalycoinproject/tokens/main/assets/3888/0x069255299Bb729399f3CECaBdc73d15d3D10a2A3/logo_24.png'
  },
  {
    chainId: 3888,
    address: '0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a',
    decimals: 18,
    name: 'KalySwap Token',
    symbol: 'KSWAP',
    logoURI: 'https://raw.githubusercontent.com/kalycoinproject/tokens/main/assets/3888/0xCC93b84cEed74Dc28c746b7697d6fA477ffFf65a/logo_24.png'
  },
  {
    chainId: 3888,
    address: '0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
    logoURI: 'https://raw.githubusercontent.com/kalycoinproject/tokens/main/assets/3888/0x2CA775C77B922A51FcF3097F52bFFdbc0250D99A/logo_24.png'
  },
  {
    chainId: 3888,
    address: '0x9cAb0c396cF0F4325913f2269a0b72BD4d46E3A9',
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
    logoURI: 'https://raw.githubusercontent.com/kalycoinproject/tokens/main/assets/3888/0x9cAb0c396cF0F4325913f2269a0b72BD4d46E3A9/logo_24.png'
  },
  {
    chainId: 3888,
    address: '0x6E92CAC380F7A7B86f4163fad0df2F277B16Edc6',
    decimals: 18,
    name: 'DAI Token',
    symbol: 'DAI',
    logoURI: 'https://raw.githubusercontent.com/kalycoinproject/tokens/main/assets/3888/0x6E92CAC380F7A7B86f4163fad0df2F277B16Edc6/logo_24.png'
  },
  {
    chainId: 3888,
    address: '0xaA77D4a26d432B82DB07F8a47B7f7F623fd92455',
    decimals: 8,
    name: 'Wrapped BTC',
    symbol: 'WBTC',
    logoURI: 'https://raw.githubusercontent.com/kalycoinproject/tokens/main/assets/3888/0xaA77D4a26d432B82DB07F8a47B7f7F623fd92455/logo_24.png'
  },
  {
    chainId: 3888,
    address: '0xfdbB253753dDE60b11211B169dC872AaE672879b',
    decimals: 18,
    name: 'Ether Token',
    symbol: 'ETH',
    logoURI: 'https://raw.githubusercontent.com/kalycoinproject/tokens/main/assets/3888/0xfdbB253753dDE60b11211B169dC872AaE672879b/logo_24.png'
  },
  {
    chainId: 3888,
    address: '0x0e2318b62a096AC68ad2D7F37592CBf0cA9c4Ddb',
    decimals: 18,
    name: 'Binance',
    symbol: 'BNB',
    logoURI: 'https://raw.githubusercontent.com/kalycoinproject/tokens/main/assets/3888/0x0e2318b62a096AC68ad2D7F37592CBf0cA9c4Ddb/logo_24.png'
  },
  {
    chainId: 3888,
    address: '0x706C9a63d7c8b7Aaf85DDCca52654645f470E8Ac',
    decimals: 18,
    name: 'Polygon Token',
    symbol: 'POL',
    logoURI: 'https://raw.githubusercontent.com/kalycoinproject/tokens/main/assets/3888/0x706C9a63d7c8b7Aaf85DDCca52654645f470E8Ac/logo_24.png'
  },
  {
    chainId: 3888,
    address: '0x376E0ac0B55aA79F9B30aAc8842e5E84fF06360C',
    decimals: 18,
    name: 'Clisha Coin',
    symbol: 'CLISHA',
    logoURI: 'https://raw.githubusercontent.com/kalycoinproject/tokens/main/assets/3888/0x376E0ac0B55aA79F9B30aAc8842e5E84fF06360C/logo_24.png'
  }
];

// Swap interface
interface SwapState {
  fromToken: Token | null;
  toToken: Token | null;
  fromAmount: string;
  toAmount: string;
  slippage: string;
  deadline: string;
}

export default function SwapsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('swap');
  const [loading, setLoading] = useState(false);

  // Use wallet hook to get connection status and address
  const { isConnected, address: userAddress } = useWallet();

  // Swap state - tokens will be set dynamically by useTokenLists
  const [swapState, setSwapState] = useState<SwapState>({
    fromToken: null, // Will be set by dynamic token loading
    toToken: null,   // Will be set by dynamic token loading
    fromAmount: '',
    toAmount: '',
    slippage: '0.5',
    deadline: '20'
  });

  // Market stats will be handled inside the PriceDataProvider wrapper

  // Settings state
  const [showSettings, setShowSettings] = useState(false);

  // Send state (for Send tab)
  const [sendState, setSendState] = useState({
    token: null as any,
    amount: '',
    recipient: ''
  });
  const [sendError, setSendError] = useState<string | null>(null);
  const [userTokens, setUserTokens] = useState<any[]>([]);

  // Wallet connection is now handled by useWallet hook

  // GraphQL queries
  const ME_QUERY = `
    query Me {
      me {
        id
        username
        wallets {
          id
          address
          chainId
          balance {
            klc
            tokens {
              symbol
              balance
              address
            }
          }
        }
      }
    }
  `;

  const SEND_TRANSACTION_MUTATION = `
    mutation SendTransaction($input: SendTransactionInput!) {
      sendTransaction(input: $input) {
        id
        hash
        status
      }
    }
  `;

  // User data state
  const [user, setUser] = useState<any>(null);
  const [activeWallet, setActiveWallet] = useState<any>(null);

  // Fetch user data and wallets
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: ME_QUERY,
          }),
        });

        const result = await response.json();
        if (!result.errors && result.data.me) {
          setUser(result.data.me);
          // Set first wallet as active
          if (result.data.me.wallets.length > 0) {
            const wallet = result.data.me.wallets[0];
            setActiveWallet(wallet);

            // Build user tokens list (KLC + ERC20 tokens)
            const tokens = [
              {
                symbol: 'KLC',
                address: 'KLC',
                balance: wallet.balance?.klc || '0',
                isNative: true
              },
              ...(wallet.balance?.tokens || []).map((token: any) => ({
                symbol: token.symbol,
                address: token.address,
                balance: token.balance,
                isNative: false
              }))
            ];
            setUserTokens(tokens);

            // Set default token to KLC
            setSendState(prev => ({ ...prev, token: tokens[0] }));
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  // Helper function to prompt for password
  const promptForPassword = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold mb-4">Enter Wallet Password</h3>
          <p class="text-sm text-gray-600 mb-4">Enter your internal wallet password to authorize this transaction.</p>
          <input
            type="password"
            placeholder="Enter your wallet password"
            class="w-full p-3 border rounded-lg mb-4 password-input"
            autofocus
          />
          <div class="flex gap-2">
            <button class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg confirm-btn">Confirm</button>
            <button class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg cancel-btn">Cancel</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const passwordInput = modal.querySelector('.password-input') as HTMLInputElement;
      const confirmBtn = modal.querySelector('.confirm-btn') as HTMLButtonElement;
      const cancelBtn = modal.querySelector('.cancel-btn') as HTMLButtonElement;

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      confirmBtn.onclick = () => {
        const password = passwordInput.value;
        cleanup();
        resolve(password || null);
      };

      cancelBtn.onclick = () => {
        cleanup();
        resolve(null);
      };

      passwordInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          confirmBtn.click();
        } else if (e.key === 'Escape') {
          cancelBtn.click();
        }
      };
    });
  };

  // Handle token swap in the swap interface
  const handleSwapTokens = () => {
    setSwapState(prev => ({
      ...prev,
      fromToken: prev.toToken,
      toToken: prev.fromToken,
      fromAmount: prev.toAmount,
      toAmount: prev.fromAmount
    }));
  };

  // Handle amount input change
  const handleFromAmountChange = (value: string) => {
    setSwapState(prev => ({ ...prev, fromAmount: value }));
    // Note: Quote calculation is handled by SwapInterface component using router contract
  };

  // Handle swap execution
  const handleSwap = async () => {
    if (!isConnected) {
      router.push('/login');
      return;
    }

    if (!swapState.fromToken || !swapState.toToken || !swapState.fromAmount) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // In a real implementation, this would interact with the KalySwap DEX smart contracts
      console.log('Executing swap:', swapState);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      alert('Swap executed successfully!');

      // Reset form
      setSwapState(prev => ({
        ...prev,
        fromAmount: '',
        toAmount: ''
      }));

    } catch (error) {
      console.error('Swap error:', error);
      alert('Swap failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle send transaction
  const handleSend = async () => {
    try {
      setSendError(null);
      setLoading(true);

      // Check if user is logged in
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Validate inputs
      if (!activeWallet) {
        setSendError('No wallet available');
        return;
      }

      if (!sendState.recipient) {
        setSendError('Recipient address is required');
        return;
      }

      if (!sendState.recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
        setSendError('Invalid recipient address format');
        return;
      }

      if (!sendState.amount || parseFloat(sendState.amount) <= 0) {
        setSendError('Amount must be greater than 0');
        return;
      }

      if (!sendState.token) {
        setSendError('Please select a token');
        return;
      }

      // Check balance
      const selectedToken = userTokens.find(t =>
        t.symbol === sendState.token.symbol && t.address === sendState.token.address
      );

      if (!selectedToken) {
        setSendError('Selected token not found');
        return;
      }

      const balance = parseFloat(selectedToken.balance);
      const amount = parseFloat(sendState.amount);

      if (amount > balance) {
        setSendError(`Insufficient ${selectedToken.symbol} balance`);
        return;
      }

      // Get password from user
      const password = await promptForPassword();
      if (!password) {
        setSendError('Password is required to sign the transaction');
        return;
      }

      // Determine asset (KLC or token address)
      const asset = sendState.token.isNative ? 'KLC' : sendState.token.address;

      // Send transaction
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: SEND_TRANSACTION_MUTATION,
          variables: {
            input: {
              walletId: activeWallet.id,
              toAddress: sendState.recipient,
              amount: sendState.amount,
              asset: asset,
              password: password,
              chainId: activeWallet.chainId
            },
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      // Reset form
      setSendState(prev => ({
        ...prev,
        amount: '',
        recipient: ''
      }));

      // Refresh user data to show updated balances
      const userResponse = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: ME_QUERY,
        }),
      });

      const userResult = await userResponse.json();
      if (!userResult.errors && userResult.data.me) {
        setUser(userResult.data.me);
        // Update active wallet and tokens
        const wallet = userResult.data.me.wallets.find((w: any) => w.id === activeWallet.id);
        if (wallet) {
          setActiveWallet(wallet);
          const tokens = [
            {
              symbol: 'KLC',
              address: 'KLC',
              balance: wallet.balance?.native?.formattedBalance || '0',
              isNative: true
            },
            ...(wallet.balance?.tokens || []).map((token: any) => ({
              symbol: token.symbol,
              address: token.address,
              balance: token.balance,
              isNative: false
            }))
          ];
          setUserTokens(tokens);
        }
      }

      alert('Transaction sent successfully!');

    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Failed to send transaction');
      console.error('Send error:', error);
    } finally {
      setLoading(false);
    }
  };

  // TokenIcon component for Send tab (matches dashboard pattern)
  const SendTokenIcon = ({ symbol, size = 20 }: { symbol: string; size?: number }) => {
    const [imageError, setImageError] = useState(false);

    // Use KLC logo for wKLC tokens
    const getTokenIconPath = (symbol: string) => {
      const lowerSymbol = symbol.toLowerCase();
      if (lowerSymbol === 'wklc') {
        return '/tokens/klc.png';
      }
      return `/tokens/${lowerSymbol}.png`;
    };

    if (imageError) {
      return (
        <div
          className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          {symbol.charAt(0)}
        </div>
      );
    }

    return (
      <img
        src={getTokenIconPath(symbol)}
        alt={symbol}
        width={size}
        height={size}
        className="rounded-full"
        onError={() => setImageError(true)}
      />
    );
  };

  // Token selector component for Send tab (uses user's actual holdings)
  const SendTokenSelector = ({
    selectedToken,
    onTokenSelect,
    label
  }: {
    selectedToken: any;
    onTokenSelect: (token: any) => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <Select
        value={selectedToken ? `${selectedToken.symbol}-${selectedToken.address}` : ''}
        onValueChange={(value) => {
          const token = userTokens.find(t => `${t.symbol}-${t.address}` === value);
          if (token) onTokenSelect(token);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select token">
            {selectedToken && (
              <div className="flex items-center gap-2">
                <SendTokenIcon symbol={selectedToken.symbol} size={24} />
                <span className="font-medium">{selectedToken.symbol}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {userTokens.map((token) => (
            <SelectItem key={`${token.symbol}-${token.address}`} value={`${token.symbol}-${token.address}`}>
              <div className="flex items-center gap-2">
                <SendTokenIcon symbol={token.symbol} size={20} />
                <span className="font-medium">{token.symbol}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // Token selector component for Swap tab (uses predefined tokens)
  const TokenSelector = ({
    selectedToken,
    onTokenSelect,
    label
  }: {
    selectedToken: Token | null;
    onTokenSelect: (token: Token) => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <Select
        value={selectedToken?.symbol || ''}
        onValueChange={(value) => {
          const token = KALYCHAIN_TOKENS.find(t => t.symbol === value);
          if (token) onTokenSelect(token);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select token">
            {selectedToken && (
              <div className="flex items-center gap-2">
                <img
                  src={selectedToken.logoURI}
                  alt={selectedToken.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling!.classList.remove('hidden');
                  }}
                />
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold hidden">
                  {selectedToken.symbol.charAt(0)}
                </div>
                <span>{selectedToken.symbol}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {KALYCHAIN_TOKENS.map((token) => (
            <SelectItem key={token.symbol} value={token.symbol}>
              <div className="flex items-center gap-2">
                <img
                  src={token.logoURI}
                  alt={token.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling!.classList.remove('hidden');
                  }}
                />
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold hidden">
                  {token.symbol.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">{token.symbol}</div>
                  <div className="text-xs text-gray-500">{token.name}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PriceDataProvider>
      <SwapsPageContent
        swapState={swapState}
        setSwapState={setSwapState}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        loading={loading}
        setLoading={setLoading}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        isConnected={isConnected}
        userAddress={userAddress}
        router={router}
        // Pass all the other state and functions
        user={user}
        activeWallet={activeWallet}
        sendState={sendState}
        setSendState={setSendState}
        sendError={sendError}
        setSendError={setSendError}
        userTokens={userTokens}
        handleSwap={handleSwap}
        handleSend={handleSend}
        handleSwapTokens={handleSwapTokens}
        handleFromAmountChange={handleFromAmountChange}
        TokenSelector={TokenSelector}
        SendTokenSelector={SendTokenSelector}
        SendTokenIcon={SendTokenIcon}
      />
    </PriceDataProvider>
  );
}

// Separate component that uses the market stats hook inside the provider
function SwapsPageContent({
  swapState,
  setSwapState,
  activeTab,
  setActiveTab,
  loading,
  setLoading,
  showSettings,
  setShowSettings,
  isConnected,
  userAddress,
  router,
  user,
  activeWallet,
  sendState,
  setSendState,
  sendError,
  setSendError,
  userTokens,
  handleSwap,
  handleSend,
  handleSwapTokens,
  handleFromAmountChange,
  TokenSelector,
  SendTokenSelector,
  SendTokenIcon
}: {
  swapState: SwapState;
  setSwapState: React.Dispatch<React.SetStateAction<SwapState>>;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  isConnected: boolean;
  userAddress: string | null | undefined;
  router: any;
  user: any;
  activeWallet: any;
  sendState: any;
  setSendState: any;
  sendError: string | null;
  setSendError: any;
  userTokens: any[];
  handleSwap: () => Promise<void>;
  handleSend: () => Promise<void>;
  handleSwapTokens: () => void;
  handleFromAmountChange: (value: string) => void;
  TokenSelector: any;
  SendTokenSelector: any;
  SendTokenIcon: any;
}) {
  // Check if client is hydrated
  const isHydrated = useHydration();

  // Get current chain ID from wallet with error handling
  let wagmiChainId: number | undefined;
  try {
    wagmiChainId = useChainId();
  } catch (error) {
    console.warn('Wagmi not available, using fallback chain ID:', error);
    wagmiChainId = undefined;
  }

  // Use wagmi chain ID if available and hydrated, otherwise fallback to KalyChain
  const chainId = isHydrated && wagmiChainId ? wagmiChainId : 3888;

  // Load dynamic tokens for current chain
  const { tokens: dynamicTokens, loading: tokensLoading, error: tokensError } = useTokenLists({ chainId });

  // Debug: Log token loading status
  console.log('🪙 Swaps page token status:', {
    chainId,
    tokensLoading,
    tokensError,
    tokenCount: dynamicTokens?.length || 0,
    tokens: dynamicTokens?.map(t => t.symbol).join(', ') || 'none'
  });

  // Get real-time pair-specific market stats (now inside the provider)
  const {
    price: pairPrice,
    priceChange24h,
    volume24h,
    liquidity,
    isLoading: pairStatsLoading,
    error: pairStatsError,
    pairAddress
  } = usePairMarketStats(swapState.fromToken || undefined, swapState.toToken || undefined);

  // Determine the base token for consistent price formatting
  // Always use the non-stablecoin token for formatting
  const baseTokenForFormatting = useMemo(() => {
    if (!swapState.fromToken || !swapState.toToken) return null;

    const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD'];

    // If fromToken is a stablecoin, use toToken as base
    if (stablecoins.includes(swapState.fromToken.symbol)) {
      return swapState.toToken;
    }
    // If toToken is a stablecoin, use fromToken as base
    else if (stablecoins.includes(swapState.toToken.symbol)) {
      return swapState.fromToken;
    }
    // If neither is a stablecoin, use alphabetically first by address
    else {
      const addrFrom = swapState.fromToken.address.toLowerCase();
      const addrTo = swapState.toToken.address.toLowerCase();
      return addrFrom < addrTo ? swapState.fromToken : swapState.toToken;
    }
  }, [swapState.fromToken?.address, swapState.fromToken?.symbol, swapState.toToken?.address, swapState.toToken?.symbol]);

  // Create default token pair from dynamic tokens based on chain
  const defaultTokenPair = useMemo(() => {
    if (!dynamicTokens || dynamicTokens.length === 0 || !chainId) return null;

    let tokenA, tokenB;

    if (chainId === 3888) {
      // KalyChain: KLC/USDT
      tokenA = dynamicTokens.find(token => token.symbol === 'KLC');
      tokenB = dynamicTokens.find(token => token.symbol === 'USDT' || token.symbol === 'USDt');
    } else if (chainId === 56) {
      // BSC: WBNB/USDT
      tokenA = dynamicTokens.find(token => token.symbol === 'WBNB' || token.symbol === 'BNB');
      tokenB = dynamicTokens.find(token => token.symbol === 'USDT');
    } else if (chainId === 42161) {
      // Arbitrum: WETH/USDC
      tokenA = dynamicTokens.find(token => token.symbol === 'WETH' || token.symbol === 'ETH');
      tokenB = dynamicTokens.find(token => token.symbol === 'USDC');
    }

    if (tokenA && tokenB) {
      return { tokenA, tokenB };
    }

    // Fallback to first two tokens
    if (dynamicTokens.length >= 2) {
      return { tokenA: dynamicTokens[0], tokenB: dynamicTokens[1] };
    }

    return null;
  }, [dynamicTokens, chainId]);

  // Debug: Log default token pair
  useEffect(() => {
    console.log('🎯 Default token pair for chain', chainId, ':',
      defaultTokenPair ? `${defaultTokenPair.tokenA.symbol}/${defaultTokenPair.tokenB.symbol}` : 'none'
    );
  }, [defaultTokenPair, chainId]);

  // Update swapState when dynamic tokens load and we don't have tokens set
  useEffect(() => {
    if (defaultTokenPair && (!swapState.fromToken || !swapState.toToken)) {
      setSwapState(prev => ({
        ...prev,
        fromToken: defaultTokenPair.tokenA,
        toToken: defaultTokenPair.tokenB
      }));
    }
  }, [defaultTokenPair, swapState.fromToken, swapState.toToken, setSwapState]);

  // Memoize token change handler to prevent infinite re-renders
  const handleTokenChange = useMemo(() => (fromToken: Token | null, toToken: Token | null) => {
    console.log(`🔄 Token change: ${fromToken?.symbol}/${toToken?.symbol}`);
    setSwapState(prev => ({
      ...prev,
      fromToken,
      toToken
    }));
  }, [setSwapState]);

  // Show loading state while tokens are loading
  if (tokensLoading) {
    return (
      <MainLayout>
        <div className="swaps-layout min-h-screen bg-gradient-to-b from-slate-50 to-white">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading tokens...</p>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show error state if tokens failed to load
  if (tokensError) {
    return (
      <MainLayout>
        <div className="swaps-layout min-h-screen bg-gradient-to-b from-slate-50 to-white">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-red-600 mb-4">Failed to load tokens: {tokensError}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="swaps-layout min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="swaps-grid grid grid-cols-1 xl:grid-cols-4 gap-6">

            {/* Left side - Trading Chart and Transaction Data */}
            <div className="xl:col-span-3 space-y-8">
              {/* Trading Chart */}
              <div className="chart-container trading-chart-wrapper">
                <TradingChart
                  tokenA={swapState.fromToken}
                  tokenB={swapState.toToken}
                  height={600}
                  showChartTypes={true}
                  className="w-full h-[500px] lg:h-[600px]"
                />
              </div>

              {/* Transaction Data Component */}
              <div className="transaction-data-container">
                <TransactionData
                  selectedPair={{
                    token0Symbol: swapState.fromToken?.symbol || 'KLC',
                    token1Symbol: swapState.toToken?.symbol || 'USDT',
                    pairAddress: pairAddress || undefined
                  }}
                  userAddress={userAddress}
                />
              </div>
            </div>

            {/* Right side - Trading controls */}
            <div className="trading-controls-container xl:col-span-1 space-y-6">



              {/* Trading interface */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <Card>
                  <CardHeader>
                    <CardTitle>Trade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="swap" className="flex items-center gap-1">
                        <ArrowUpDown className="h-3 w-3" />
                        Swap
                      </TabsTrigger>
                      <TabsTrigger value="limit" disabled className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Limit
                      </TabsTrigger>
                      <TabsTrigger value="send" className="flex items-center gap-1">
                        <Send className="h-3 w-3" />
                        Send
                      </TabsTrigger>
                      <TabsTrigger value="buy" disabled className="flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        Buy
                      </TabsTrigger>
                    </TabsList>
                  </CardContent>
                </Card>

                <TabsContent value="swap" className="mt-1">
                  <SwapInterfaceWrapper
                    fromToken={swapState.fromToken}
                    toToken={swapState.toToken}
                    onTokenChange={handleTokenChange}
                  />
                </TabsContent>

                <TabsContent value="limit" className="mt-1">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Limit Orders Coming Soon</p>
                        <p className="text-sm">Set price targets for automatic execution</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="send" className="mt-1">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      {!activeWallet ? (
                        <div className="text-center py-8 text-gray-500">
                          <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="font-medium">No Wallet Connected</p>
                          <p className="text-sm">Please log in to send tokens</p>
                        </div>
                      ) : (
                        <>
                          <SendTokenSelector
                            selectedToken={sendState.token}
                            onTokenSelect={(token: any) => setSendState((prev: any) => ({ ...prev, token }))}
                            label="Asset"
                          />

                          <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                              type="number"
                              placeholder="0.0"
                              value={sendState.amount}
                              onChange={(e) => setSendState((prev: any) => ({ ...prev, amount: e.target.value }))}
                              className="text-lg h-12"
                            />
                            {sendState.token && (
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>
                                  Available: {parseFloat(sendState.token.balance).toFixed(6)} {sendState.token.symbol}
                                </span>
                                <button
                                  type="button"
                                  className="text-blue-600 hover:underline"
                                  onClick={() => setSendState((prev: any) => ({ ...prev, amount: sendState.token.balance }))}
                                >
                                  Max
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Recipient Address</Label>
                            <Input
                              placeholder="0x..."
                              value={sendState.recipient}
                              onChange={(e) => setSendState((prev: any) => ({ ...prev, recipient: e.target.value }))}
                              className="font-mono"
                            />
                          </div>

                          {sendError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-600">{sendError}</p>
                            </div>
                          )}

                          <Button
                            onClick={handleSend}
                            disabled={loading || !sendState.amount || !sendState.recipient || !sendState.token}
                            className="w-full h-12 text-lg"
                          >
                            {loading ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Sending...
                              </div>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Send
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="buy" className="mt-1">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8 text-gray-500">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Buy Crypto Coming Soon</p>
                        <p className="text-sm">Purchase crypto with fiat currency</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Quick stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {swapState.fromToken?.symbol}/{swapState.toToken?.symbol} Market Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Price</span>
                    <div className="flex items-center gap-2">
                      {pairStatsLoading ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                      ) : pairStatsError ? (
                        <span className="text-xs text-red-600">Error loading price</span>
                      ) : (
                        <>
                          <span className="font-medium">
                            {pairPrice > 0 ? formatTokenPrice(pairPrice, baseTokenForFormatting?.symbol || '') : '0.00000000'}
                          </span>
                          {priceChange24h !== 0 && (
                            <span
                              className={`text-xs px-1 py-0.5 rounded ${
                                priceChange24h >= 0
                                  ? 'text-green-300 bg-green-900/30'
                                  : 'text-red-300 bg-red-900/30'
                              }`}
                            >
                              {formatPriceChange(priceChange24h)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">24h Volume</span>
                    {pairStatsLoading ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    ) : (
                      <span className="font-medium">
                        ${volume24h > 0 ? volume24h.toLocaleString() : '0'}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Liquidity</span>
                    {pairStatsLoading ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    ) : (
                      <span className="font-medium">
                        ${liquidity > 0 ? liquidity.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}