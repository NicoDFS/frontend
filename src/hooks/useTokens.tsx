'use client';

import { useState, useEffect } from 'react';

interface Token {
  chainId: number;
  address: string;
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  balance?: string;
}

// Official KalyChain tokens from https://raw.githubusercontent.com/KalyCoinProject/tokenlists/main/kalyswap.tokenlist.json
const COMMON_TOKENS: Token[] = [
  // Add native KLC as first option
  {
    chainId: 3888,
    address: '0x0000000000000000000000000000000000000000', // Native token
    decimals: 18,
    name: 'KalyCoin',
    symbol: 'KLC',
    logoURI: 'https://raw.githubusercontent.com/kalycoinproject/tokens/main/assets/3888/0x069255299Bb729399f3CECaBdc73d15d3D10a2A3/logo_24.png'
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
    symbol: 'USDt',
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
  }
];

export function useTokens() {
  const [tokens, setTokens] = useState<Token[]>(COMMON_TOKENS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTokensFromSubgraph();
  }, []);

  const fetchTokensFromSubgraph = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual GraphQL query to the DEX subgraph
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetTokens {
              tokens(
                first: 100
                orderBy: tradeVolumeUSD
                orderDirection: desc
                where: { tradeVolumeUSD_gt: "0" }
              ) {
                id
                symbol
                name
                decimals
                tradeVolumeUSD
                totalLiquidity
              }
            }
          `
        })
      });

      if (response.ok) {
        const data = await response.json();

        if (data.data && data.data.tokens) {
          const subgraphTokens: Token[] = data.data.tokens.map((token: any) => ({
            chainId: 3888,
            address: token.id,
            symbol: token.symbol,
            name: token.name,
            decimals: parseInt(token.decimals),
            logoURI: `https://raw.githubusercontent.com/kalycoinproject/tokens/main/assets/3888/${token.id}/logo_24.png`
          }));

          // Merge with common tokens, prioritizing common tokens
          const mergedTokens = mergeTokenLists(COMMON_TOKENS, subgraphTokens);
          setTokens(mergedTokens);
        }
      } else {
        console.warn('Failed to fetch tokens from subgraph, using common tokens');
      }
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setError('Failed to load tokens');
      // Keep using common tokens as fallback
    } finally {
      setLoading(false);
    }
  };

  const mergeTokenLists = (commonTokens: Token[], subgraphTokens: Token[]): Token[] => {
    const tokenMap = new Map<string, Token>();

    // Add common tokens first (higher priority)
    commonTokens.forEach(token => {
      tokenMap.set(token.address.toLowerCase(), token);
    });

    // Add subgraph tokens if not already present
    subgraphTokens.forEach(token => {
      const key = token.address.toLowerCase();
      if (!tokenMap.has(key)) {
        tokenMap.set(key, token);
      }
    });

    return Array.from(tokenMap.values());
  };



  const getTokenByAddress = (address: string): Token | undefined => {
    return tokens.find(token =>
      token.address.toLowerCase() === address.toLowerCase()
    );
  };

  const getTokenBySymbol = (symbol: string): Token | undefined => {
    return tokens.find(token =>
      token.symbol.toLowerCase() === symbol.toLowerCase()
    );
  };

  const searchTokens = (query: string): Token[] => {
    if (!query) return tokens;

    const queryLower = query.toLowerCase();
    return tokens.filter(token =>
      token.symbol.toLowerCase().includes(queryLower) ||
      token.name.toLowerCase().includes(queryLower) ||
      token.address.toLowerCase().includes(queryLower)
    );
  };

  return {
    tokens,
    loading,
    error,
    getTokenByAddress,
    getTokenBySymbol,
    searchTokens,
    refetch: fetchTokensFromSubgraph
  };
}
