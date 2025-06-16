/**
 * GraphQL queries for transaction management
 */

export const GET_USER_TRANSACTIONS = `
  query GetUserTransactions($limit: Int, $offset: Int) {
    me {
      id
      transactions(limit: $limit, offset: $offset) {
        id
        type
        status
        hash
        fromAddress
        toAddress
        amount
        tokenAddress
        tokenSymbol
        tokenDecimals
        fee
        blockNumber
        timestamp
      }
    }
  }
`;

export const GET_SWAP_TRANSACTIONS = `
  query GetSwapTransactions($userAddress: String, $limit: Int, $offset: Int) {
    me {
      transactions(limit: $limit, offset: $offset) {
        id
        type
        status
        hash
        fromAddress
        toAddress
        amount
        tokenAddress
        tokenSymbol
        tokenDecimals
        fee
        blockNumber
        timestamp
      }
    }
  }
`;

export const TRACK_SWAP_TRANSACTION = `
  mutation TrackSwapTransaction(
    $hash: String!
    $fromAddress: String!
    $toAddress: String
    $amount: String!
    $tokenAddress: String
    $tokenSymbol: String
    $tokenDecimals: Int
    $fee: String
    $walletId: ID!
  ) {
    trackSendTransaction(
      hash: $hash
      toAddress: $toAddress
      amount: $amount
      tokenAddress: $tokenAddress
      tokenSymbol: $tokenSymbol
      tokenDecimals: $tokenDecimals
      fee: $fee
      walletId: $walletId
    ) {
      id
      hash
      status
      type
      fromAddress
      toAddress
      amount
      tokenAddress
      tokenSymbol
      tokenDecimals
      fee
      blockNumber
      timestamp
    }
  }
`;

export const UPDATE_TRANSACTION_STATUS = `
  mutation UpdateTransactionStatus(
    $hash: String!
    $status: String!
    $blockNumber: Int
  ) {
    updateTransactionStatus(
      hash: $hash
      status: $status
      blockNumber: $blockNumber
    ) {
      id
      hash
      status
      blockNumber
      timestamp
    }
  }
`;

export const GET_TRANSACTION_BY_HASH = `
  query GetTransactionByHash($hash: String!) {
    transactionByHash(hash: $hash) {
      id
      type
      status
      hash
      fromAddress
      toAddress
      amount
      tokenAddress
      tokenSymbol
      tokenDecimals
      fee
      blockNumber
      timestamp
    }
  }
`;

/**
 * Helper function to execute GraphQL queries
 */
export async function executeGraphQLQuery(
  query: string, 
  variables: Record<string, any> = {},
  requireAuth: boolean = true
) {
  const token = localStorage.getItem('auth_token');
  
  if (requireAuth && !token) {
    throw new Error('Authentication required');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

/**
 * Fetch user transactions
 */
export async function fetchUserTransactions(limit: number = 20, offset: number = 0) {
  const data = await executeGraphQLQuery(GET_USER_TRANSACTIONS, { limit, offset });
  return data.me.transactions;
}

/**
 * Track a new swap transaction
 */
export async function trackSwapTransaction(transactionData: {
  hash: string;
  fromAddress: string;
  toAddress?: string;
  amount: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  fee?: string;
  walletId: string;
}) {
  const data = await executeGraphQLQuery(TRACK_SWAP_TRANSACTION, transactionData);
  return data.trackSendTransaction;
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  hash: string, 
  status: string, 
  blockNumber?: number
) {
  const data = await executeGraphQLQuery(UPDATE_TRANSACTION_STATUS, {
    hash,
    status: status.toUpperCase(),
    blockNumber
  });
  return data.updateTransactionStatus;
}

/**
 * Get transaction by hash
 */
export async function getTransactionByHash(hash: string) {
  const data = await executeGraphQLQuery(GET_TRANSACTION_BY_HASH, { hash });
  return data.transactionByHash;
}
