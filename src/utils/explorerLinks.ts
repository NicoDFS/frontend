/**
 * Blockchain Explorer URL utilities
 * Provides links to block explorers for different chains
 */

/**
 * Get the explorer base URL for a chain
 */
export function getExplorerUrl(chainId: number): string {
  switch (chainId) {
    case 3888:
      return 'https://kalyscan.io';
    case 56:
      return 'https://bscscan.com';
    case 42161:
      return 'https://arbiscan.io';
    default:
      return '';
  }
}

/**
 * Get the explorer name for a chain
 */
export function getExplorerName(chainId: number): string {
  switch (chainId) {
    case 3888:
      return 'KalyScan';
    case 56:
      return 'BSCScan';
    case 42161:
      return 'Arbiscan';
    default:
      return 'Explorer';
  }
}

/**
 * Get the address page URL on the explorer
 */
export function getAddressUrl(chainId: number, address: string): string {
  const baseUrl = getExplorerUrl(chainId);
  if (!baseUrl) return '';
  return `${baseUrl}/address/${address}`;
}

/**
 * Get the transaction page URL on the explorer
 */
export function getTransactionUrl(chainId: number, txHash: string): string {
  const baseUrl = getExplorerUrl(chainId);
  if (!baseUrl) return '';
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get the token page URL on the explorer
 */
export function getTokenUrl(chainId: number, tokenAddress: string): string {
  const baseUrl = getExplorerUrl(chainId);
  if (!baseUrl) return '';
  return `${baseUrl}/token/${tokenAddress}`;
}

