'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, formatUnits, getContract, encodeFunctionData } from 'viem';
import { getContractAddress, DEFAULT_CHAIN_ID } from '@/config/contracts';
import { ROUTER_ABI, FACTORY_ABI, PAIR_ABI, ERC20_ABI } from '@/config/abis';
import { internalWalletUtils } from '@/connectors/internalWallet';

export enum ApprovalState {
  UNKNOWN = 'UNKNOWN',
  NOT_APPROVED = 'NOT_APPROVED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED'
}

interface PairInfo {
  address: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  exists: boolean;
}

interface OptimalAmounts {
  amountA: string;
  amountB: string;
}

interface ApprovalInfo {
  state: ApprovalState;
  approve: () => Promise<void>;
}

export function usePools() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalStates, setApprovalStates] = useState<{[key: string]: ApprovalState}>({});

  // Wagmi hooks for wallet interaction
  const { address, isConnected, connector } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Check if using internal wallet
  const isUsingInternalWallet = () => {
    return connector?.id === 'kalyswap-internal';
  };

  // Helper function to prompt for password (similar to swap interface)
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
            <button class="flex-1 px-4 py-2 bg-gray-200 rounded-lg cancel-btn">Cancel</button>
          </div>
        </div>
      `;

      const passwordInput = modal.querySelector('.password-input') as HTMLInputElement;
      const confirmBtn = modal.querySelector('.confirm-btn') as HTMLButtonElement;
      const cancelBtn = modal.querySelector('.cancel-btn') as HTMLButtonElement;

      const handleConfirm = () => {
        const password = passwordInput.value;
        document.body.removeChild(modal);
        resolve(password || null);
      };

      const handleCancel = () => {
        document.body.removeChild(modal);
        resolve(null);
      };

      confirmBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleConfirm();
      });

      document.body.appendChild(modal);
    });
  };

  // Helper function to execute contract calls with proper internal wallet handling
  const executeContractCall = async (contractAddress: string, functionName: string, args: any[], value?: bigint, abi = ROUTER_ABI) => {
    if (isUsingInternalWallet()) {
      const internalWalletState = internalWalletUtils.getState();
      if (!internalWalletState.activeWallet) {
        throw new Error('No internal wallet connected');
      }

      const password = await promptForPassword();
      if (!password) {
        throw new Error('Password required for transaction signing');
      }

      const data = encodeFunctionData({
        abi,
        functionName,
        args
      });

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            mutation SendContractTransaction($input: SendContractTransactionInput!) {
              sendContractTransaction(input: $input) {
                id
                hash
                status
              }
            }
          `,
          variables: {
            input: {
              walletId: internalWalletState.activeWallet.id,
              toAddress: contractAddress,
              value: value?.toString() || '0',
              data: data,
              password: password,
              chainId: internalWalletState.activeWallet.chainId,
              gasLimit: '500000'
            }
          }
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      return result.data.sendContractTransaction.hash as `0x${string}`;
    } else {
      if (!walletClient) throw new Error('Wallet client not available');

      console.log('📝 Executing external wallet contract call:', {
        address: contractAddress,
        functionName,
        args,
        value: value?.toString()
      });

      try {
        // Try without gas limit first to let wallet estimate
        const result = await walletClient.writeContract({
          address: contractAddress as `0x${string}`,
          abi,
          functionName,
          args,
          value,
        });

        console.log('✅ Contract call successful:', result);
        return result;
      } catch (err) {
        console.error('❌ Contract call failed:', err);
        throw err;
      }
    }
  };

  // Simple approval function (not a hook to avoid infinite re-renders)
  const approveToken = useCallback(async (
    tokenAddress: string,
    routerAddress?: string
  ): Promise<void> => {
    const spenderAddress = routerAddress || getContractAddress('ROUTER', DEFAULT_CHAIN_ID);

    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (!walletClient) {
      throw new Error('Wallet client not available');
    }

    try {
      console.log(`📝 Starting approval process...`);
      console.log(`📝 Token: ${tokenAddress}`);
      console.log(`📝 Spender: ${spenderAddress}`);
      console.log(`📝 User address: ${address}`);
      console.log(`📝 Wallet client available: ${!!walletClient}`);

      // Use MaxUint256 for approval like the old UI
      const maxAmount = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      console.log(`📝 Calling executeContractCall...`);
      const approveHash = await executeContractCall(
        tokenAddress,
        'approve',
        [spenderAddress, maxAmount],
        BigInt(0),
        ERC20_ABI
      );

      console.log(`📝 Approval hash: ${approveHash}`);
      console.log(`📝 Waiting for transaction receipt...`);
      await publicClient?.waitForTransactionReceipt({ hash: approveHash });
      console.log('✅ Token approved successfully');
    } catch (err) {
      console.error('❌ Error approving token:', err);
      throw err;
    }
  }, [executeContractCall, publicClient, address, walletClient]);

  const getPairInfo = useCallback(async (tokenA: string, tokenB: string): Promise<PairInfo | null> => {
    if (!publicClient) return null;

    try {
      const factoryAddress = getContractAddress('FACTORY', DEFAULT_CHAIN_ID);
      const factoryContract = getContract({
        address: factoryAddress as `0x${string}`,
        abi: FACTORY_ABI,
        client: publicClient,
      });

      // Get pair address from factory
      const pairAddress = await factoryContract.read.getPair([tokenA, tokenB]);

      // Check if pair exists (address is not zero)
      if (pairAddress === '0x0000000000000000000000000000000000000000') {
        return {
          address: '',
          token0: tokenA,
          token1: tokenB,
          reserve0: '0',
          reserve1: '0',
          totalSupply: '0',
          exists: false
        };
      }

      // Get pair contract to fetch reserves
      const pairContract = getContract({
        address: pairAddress as `0x${string}`,
        abi: PAIR_ABI,
        client: publicClient,
      });

      // Get reserves and total supply
      const [reserves, totalSupply, token0Address, token1Address] = await Promise.all([
        pairContract.read.getReserves(),
        pairContract.read.totalSupply(),
        pairContract.read.token0(),
        pairContract.read.token1()
      ]);

      // Get token decimals for proper formatting
      let token0Decimals = 18;
      let token1Decimals = 18;

      try {
        // Try to get decimals from token contracts
        const token0Contract = getContract({
          address: token0Address as `0x${string}`,
          abi: ERC20_ABI,
          client: publicClient,
        });
        const token1Contract = getContract({
          address: token1Address as `0x${string}`,
          abi: ERC20_ABI,
          client: publicClient,
        });

        [token0Decimals, token1Decimals] = await Promise.all([
          token0Contract.read.decimals(),
          token1Contract.read.decimals()
        ]);
      } catch (err) {
        console.warn('Could not fetch token decimals, using 18 as default');
      }

      return {
        address: pairAddress,
        token0: token0Address,
        token1: token1Address,
        reserve0: formatUnits(reserves[0], token0Decimals),
        reserve1: formatUnits(reserves[1], token1Decimals),
        totalSupply: formatUnits(totalSupply, 18),
        exists: true
      };
    } catch (err) {
      console.error('Error fetching pair info:', err);
      return null;
    }
  }, [publicClient]);

  const calculateOptimalAmounts = useCallback(async (
    tokenA: string,
    tokenB: string,
    amount: string,
    inputToken: 'A' | 'B'
  ): Promise<OptimalAmounts | null> => {
    try {
      const pairInfo = await getPairInfo(tokenA, tokenB);
      
      if (!pairInfo || !pairInfo.exists) {
        // For new pools, user can set any ratio
        return null;
      }

      const reserve0 = parseFloat(pairInfo.reserve0);
      const reserve1 = parseFloat(pairInfo.reserve1);
      const inputAmount = parseFloat(amount);

      if (reserve0 === 0 || reserve1 === 0 || inputAmount === 0) {
        return null;
      }

      let amountA: string, amountB: string;

      // Determine which token is token0 and token1
      const isTokenAFirst = tokenA.toLowerCase() === pairInfo.token0.toLowerCase();
      
      if (inputToken === 'A') {
        amountA = amount;
        if (isTokenAFirst) {
          // tokenA is token0, calculate token1 amount
          amountB = ((inputAmount * reserve1) / reserve0).toFixed(6);
        } else {
          // tokenA is token1, calculate token0 amount
          amountB = ((inputAmount * reserve0) / reserve1).toFixed(6);
        }
      } else {
        amountB = amount;
        if (isTokenAFirst) {
          // tokenB is token1, calculate token0 amount
          amountA = ((inputAmount * reserve0) / reserve1).toFixed(6);
        } else {
          // tokenB is token0, calculate token1 amount
          amountA = ((inputAmount * reserve1) / reserve0).toFixed(6);
        }
      }

      return { amountA, amountB };
    } catch (err) {
      console.error('Error calculating optimal amounts:', err);
      return null;
    }
  }, [getPairInfo]);



  // Forward declaration for addLiquidity function
  const addLiquidityRef = useRef<any>(null);

  const addLiquidity = useCallback(async (
    tokenA: string,
    tokenB: string,
    amountA: string,
    amountB: string,
    tokenADecimals: number = 18,
    tokenBDecimals: number = 18
  ): Promise<boolean> => {
    if (!publicClient || !address) {
      setError('Wallet not connected');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const routerAddress = getContractAddress('ROUTER', DEFAULT_CHAIN_ID);
      const wklcAddress = getContractAddress('WKLC', DEFAULT_CHAIN_ID);

      // Convert amounts to proper decimals
      const amountADesired = parseUnits(amountA, tokenADecimals);
      const amountBDesired = parseUnits(amountB, tokenBDecimals);

      // Set minimum amounts (with 0.5% slippage tolerance)
      const amountAMin = (amountADesired * BigInt(995)) / BigInt(1000);
      const amountBMin = (amountBDesired * BigInt(995)) / BigInt(1000);

      // Calculate deadline (current time + 20 minutes)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + (20 * 60));

      console.log('🚀 Adding liquidity:', {
        tokenA,
        tokenB,
        amountA,
        amountB,
        amountADesired: amountADesired.toString(),
        amountBDesired: amountBDesired.toString()
      });

      // Check if either token is native KLC
      const isTokenANative = tokenA === '0x0000000000000000000000000000000000000000';
      const isTokenBNative = tokenB === '0x0000000000000000000000000000000000000000';

      if (isTokenANative || isTokenBNative) {
        // Handle KLC + Token liquidity
        const token = isTokenANative ? tokenB : tokenA;
        const tokenAmount = isTokenANative ? amountBDesired : amountADesired;
        const tokenAmountMin = isTokenANative ? amountBMin : amountAMin;
        const klcAmount = isTokenANative ? amountADesired : amountBDesired;
        const klcAmountMin = isTokenANative ? amountAMin : amountBMin;

        // Note: Token approval should be handled by the UI before calling this function
        console.log('🔄 Adding KLC + Token liquidity...');
        const liquidityHash = await executeContractCall(
          routerAddress,
          'addLiquidityKLC',
          [token, tokenAmount, tokenAmountMin, klcAmountMin, address, deadline],
          klcAmount
        );

        console.log(`🔄 Add liquidity hash: ${liquidityHash}`);
        await publicClient.waitForTransactionReceipt({ hash: liquidityHash });
        console.log('✅ Liquidity added successfully');
      } else {
        // Handle Token + Token liquidity
        // Note: Approvals should be handled by the UI before calling this function
        console.log('🔄 Adding Token + Token liquidity...');
        const liquidityHash = await executeContractCall(
          routerAddress,
          'addLiquidity',
          [tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, address, deadline]
        );

        console.log(`🔄 Add liquidity hash: ${liquidityHash}`);
        await publicClient.waitForTransactionReceipt({ hash: liquidityHash });
        console.log('✅ Liquidity added successfully');
      }

      return true;
    } catch (err) {
      console.error('❌ Error adding liquidity:', err);
      setError(`Failed to add liquidity: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicClient, address, executeContractCall]);

  // Update the ref with the addLiquidity function
  addLiquidityRef.current = addLiquidity;

  const createPair = useCallback(async (
    tokenA: string,
    tokenB: string,
    amountA: string,
    amountB: string,
    tokenADecimals: number = 18,
    tokenBDecimals: number = 18
  ): Promise<boolean> => {
    if (!publicClient || !address) {
      setError('Wallet not connected');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const factoryAddress = getContractAddress('FACTORY', DEFAULT_CHAIN_ID);

      console.log('🚀 Creating pair and adding liquidity:', {
        tokenA,
        tokenB,
        amountA,
        amountB
      });

      // Step 1: Check if pair already exists
      const existingPair = await getPairInfo(tokenA, tokenB);
      if (existingPair && existingPair.exists) {
        console.log('⚠️ Pair already exists, adding liquidity to existing pair');
        return await addLiquidityRef.current(tokenA, tokenB, amountA, amountB, tokenADecimals, tokenBDecimals);
      }

      // Step 2: Create the pair
      console.log('🏭 Creating new pair...');
      const createPairHash = await executeContractCall(
        factoryAddress,
        'createPair',
        [tokenA, tokenB],
        BigInt(0),
        FACTORY_ABI
      );

      console.log(`🏭 Create pair hash: ${createPairHash}`);
      await publicClient.waitForTransactionReceipt({ hash: createPairHash });
      console.log('✅ Pair created successfully');

      // Step 3: Add initial liquidity to the new pair
      console.log('💧 Adding initial liquidity to new pair...');
      const liquidityResult = await addLiquidityRef.current(tokenA, tokenB, amountA, amountB, tokenADecimals, tokenBDecimals);

      if (liquidityResult) {
        console.log('🎉 Pair created and liquidity added successfully!');
      }

      return liquidityResult;
    } catch (err) {
      console.error('❌ Error creating pair:', err);
      setError(`Failed to create pair: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicClient, address, executeContractCall, getPairInfo]);

  const removeLiquidity = useCallback(async (
    tokenA: string,
    tokenB: string,
    liquidity: string,
    amountAMin: string,
    amountBMin: string,
    tokenADecimals: number = 18,
    tokenBDecimals: number = 18
  ): Promise<boolean> => {
    if (!publicClient || !address) {
      setError('Wallet not connected');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const routerAddress = getContractAddress('ROUTER', DEFAULT_CHAIN_ID);
      const wklcAddress = getContractAddress('WKLC', DEFAULT_CHAIN_ID);

      console.log('🔥 Removing liquidity:', {
        tokenA,
        tokenB,
        liquidity,
        amountAMin,
        amountBMin
      });

      // Convert amounts to proper decimals
      const liquidityAmount = parseUnits(liquidity, 18); // LP tokens are always 18 decimals
      const amountAMinBN = parseUnits(amountAMin, tokenADecimals);
      const amountBMinBN = parseUnits(amountBMin, tokenBDecimals);

      // Get pair address for LP token approval
      const factoryAddress = getContractAddress('FACTORY', DEFAULT_CHAIN_ID);
      const pairAddress = await publicClient.readContract({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'getPair',
        args: [tokenA, tokenB]
      });

      if (pairAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Pair does not exist');
      }

      // Step 1: Approve LP tokens for router
      console.log('📝 Approving LP tokens for router...');
      const approveHash = await executeContractCall(
        pairAddress,
        'approve',
        [routerAddress, liquidityAmount],
        BigInt(0),
        ERC20_ABI
      );

      console.log(`📝 LP token approval hash: ${approveHash}`);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log('✅ LP tokens approved');

      // Step 2: Remove liquidity
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes from now
      const isKLCPair = tokenA === wklcAddress || tokenB === wklcAddress;

      if (isKLCPair) {
        // Handle KLC pairs (removeLiquidityKLC)
        const token = tokenA === wklcAddress ? tokenB : tokenA;
        const tokenAmountMin = tokenA === wklcAddress ? amountBMinBN : amountAMinBN;
        const klcAmountMin = tokenA === wklcAddress ? amountAMinBN : amountBMinBN;

        console.log('🔄 Removing KLC + Token liquidity...');
        const removeLiquidityHash = await executeContractCall(
          routerAddress,
          'removeLiquidityKLC',
          [token, liquidityAmount, tokenAmountMin, klcAmountMin, address, deadline]
        );

        console.log(`🔄 Remove liquidity hash: ${removeLiquidityHash}`);
        await publicClient.waitForTransactionReceipt({ hash: removeLiquidityHash });
        console.log('✅ KLC liquidity removed successfully');
      } else {
        // Handle Token + Token pairs (removeLiquidity)
        console.log('🔄 Removing Token + Token liquidity...');
        const removeLiquidityHash = await executeContractCall(
          routerAddress,
          'removeLiquidity',
          [tokenA, tokenB, liquidityAmount, amountAMinBN, amountBMinBN, address, deadline]
        );

        console.log(`🔄 Remove liquidity hash: ${removeLiquidityHash}`);
        await publicClient.waitForTransactionReceipt({ hash: removeLiquidityHash });
        console.log('✅ Token liquidity removed successfully');
      }

      return true;
    } catch (err) {
      console.error('❌ Error removing liquidity:', err);
      setError(`Failed to remove liquidity: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicClient, address, executeContractCall]);

  const getUserPools = useCallback(async (userAddress: string) => {
    try {
      // TODO: Query subgraph for user's liquidity positions
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetUserPools($user: String!) {
              liquidityPositions(where: { user: $user, liquidityTokenBalance_gt: "0" }) {
                id
                liquidityTokenBalance
                pair {
                  id
                  token0 {
                    id
                    symbol
                    name
                  }
                  token1 {
                    id
                    symbol
                    name
                  }
                  reserve0
                  reserve1
                  totalSupply
                }
              }
            }
          `,
          variables: {
            user: userAddress.toLowerCase()
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.data?.liquidityPositions || [];
      }
      
      return [];
    } catch (err) {
      console.error('Error fetching user pools:', err);
      return [];
    }
  }, []);

  return {
    loading,
    error,
    getPairInfo,
    calculateOptimalAmounts,
    createPair,
    addLiquidity,
    removeLiquidity,
    getUserPools,
    // Approval functions
    approveToken,
    ApprovalState
  };
}
