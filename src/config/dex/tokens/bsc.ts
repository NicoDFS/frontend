import { Token } from '../types';

// BSC tokens - Popular PancakeSwap tokens
export const BSC_TOKENS: Token[] = [
  // Native BNB
  {
    chainId: 56,
    address: '0x0000000000000000000000000000000000000000', // Native token
    decimals: 18,
    name: 'BNB',
    symbol: 'BNB',
    logoURI: '/tokens/bnb.png',
    isNative: true
  },
  // Wrapped BNB
  {
    chainId: 56,
    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    decimals: 18,
    name: 'Wrapped BNB',
    symbol: 'WBNB',
    logoURI: '/tokens/bnb.png'
  },
  // PancakeSwap Token
  {
    chainId: 56,
    address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    decimals: 18,
    name: 'PancakeSwap Token',
    symbol: 'CAKE',
    logoURI: '/tokens/cake.png'
  },
  // Stablecoins
  {
    chainId: 56,
    address: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
    name: 'Tether USD',
    symbol: 'USDT',
    logoURI: '/tokens/usdt.png'
  },
  {
    chainId: 56,
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    decimals: 18,
    name: 'USD Coin',
    symbol: 'USDC',
    logoURI: '/tokens/usdc.png'
  },
  {
    chainId: 56,
    address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    decimals: 18,
    name: 'BUSD Token',
    symbol: 'BUSD',
    logoURI: '/tokens/busd.png'
  },
  {
    chainId: 56,
    address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    decimals: 18,
    name: 'Dai Token',
    symbol: 'DAI',
    logoURI: '/tokens/dai.png'
  },
  // Major tokens
  {
    chainId: 56,
    address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    decimals: 18,
    name: 'BTCB Token',
    symbol: 'BTCB',
    logoURI: '/tokens/btcb.png'
  },
  {
    chainId: 56,
    address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    decimals: 18,
    name: 'Ethereum Token',
    symbol: 'ETH',
    logoURI: '/tokens/eth.png'
  },
  {
    chainId: 56,
    address: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
    decimals: 18,
    name: 'Cardano Token',
    symbol: 'ADA',
    logoURI: '/tokens/ada.png'
  },
  {
    chainId: 56,
    address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43',
    decimals: 8,
    name: 'Dogecoin',
    symbol: 'DOGE',
    logoURI: '/tokens/doge.png'
  },
  {
    chainId: 56,
    address: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE',
    decimals: 18,
    name: 'XRP Token',
    symbol: 'XRP',
    logoURI: '/tokens/xrp.png'
  },
  // DeFi tokens
  {
    chainId: 56,
    address: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD',
    decimals: 18,
    name: 'ChainLink Token',
    symbol: 'LINK',
    logoURI: '/tokens/link.png'
  },
  {
    chainId: 56,
    address: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
    decimals: 18,
    name: 'Polkadot Token',
    symbol: 'DOT',
    logoURI: '/tokens/dot.png'
  },
  {
    chainId: 56,
    address: '0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf',
    decimals: 18,
    name: 'Bitcoin Cash Token',
    symbol: 'BCH',
    logoURI: '/tokens/bch.png'
  }
];

// Helper function to get token by address
export function getBSCTokenByAddress(address: string): Token | undefined {
  return BSC_TOKENS.find(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}

// Helper function to get token by symbol
export function getBSCTokenBySymbol(symbol: string): Token | undefined {
  return BSC_TOKENS.find(token => 
    token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}
