import { Token } from '../types';

// Arbitrum tokens - Popular Uniswap V2 tokens on Arbitrum
export const ARBITRUM_TOKENS: Token[] = [
  // Native ETH
  {
    chainId: 42161,
    address: '0x0000000000000000000000000000000000000000', // Native token
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
    logoURI: '/tokens/eth.png',
    isNative: true
  },
  // Wrapped ETH
  {
    chainId: 42161,
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    decimals: 18,
    name: 'Wrapped Ether',
    symbol: 'WETH',
    logoURI: '/tokens/eth.png'
  },
  // Arbitrum Token
  {
    chainId: 42161,
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    decimals: 18,
    name: 'Arbitrum',
    symbol: 'ARB',
    logoURI: '/tokens/arb.png'
  },
  // Stablecoins
  {
    chainId: 42161,
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
    logoURI: '/tokens/usdt.png'
  },
  {
    chainId: 42161,
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
    logoURI: '/tokens/usdc.png'
  },
  {
    chainId: 42161,
    address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    decimals: 6,
    name: 'USD Coin (Bridged)',
    symbol: 'USDC.e',
    logoURI: '/tokens/usdc.png'
  },
  {
    chainId: 42161,
    address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    decimals: 18,
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    logoURI: '/tokens/dai.png'
  },
  // Major tokens
  {
    chainId: 42161,
    address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    decimals: 8,
    name: 'Wrapped BTC',
    symbol: 'WBTC',
    logoURI: '/tokens/wbtc.png'
  },
  {
    chainId: 42161,
    address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    decimals: 18,
    name: 'ChainLink Token',
    symbol: 'LINK',
    logoURI: '/tokens/link.png'
  },
  {
    chainId: 42161,
    address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
    decimals: 18,
    name: 'Uniswap',
    symbol: 'UNI',
    logoURI: '/tokens/uni.png'
  },
  // DeFi tokens
  {
    chainId: 42161,
    address: '0x539bdE0d7Dbd336b79148AA742883198BBF60342',
    decimals: 18,
    name: 'MAGIC',
    symbol: 'MAGIC',
    logoURI: '/tokens/magic.png'
  },
  {
    chainId: 42161,
    address: '0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55',
    decimals: 18,
    name: 'Dopex Rebate Token',
    symbol: 'DPX',
    logoURI: '/tokens/dpx.png'
  },
  {
    chainId: 42161,
    address: '0x3082CC23568eA640225c2467653dB90e9250AaA0',
    decimals: 18,
    name: 'Radiant Capital',
    symbol: 'RDNT',
    logoURI: '/tokens/rdnt.png'
  },
  {
    chainId: 42161,
    address: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
    decimals: 18,
    name: 'Frax',
    symbol: 'FRAX',
    logoURI: '/tokens/frax.png'
  },
  {
    chainId: 42161,
    address: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978',
    decimals: 18,
    name: 'Curve DAO Token',
    symbol: 'CRV',
    logoURI: '/tokens/crv.png'
  }
];

// Helper function to get token by address
export function getArbitrumTokenByAddress(address: string): Token | undefined {
  return ARBITRUM_TOKENS.find(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}

// Helper function to get token by symbol
export function getArbitrumTokenBySymbol(symbol: string): Token | undefined {
  return ARBITRUM_TOKENS.find(token => 
    token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}
