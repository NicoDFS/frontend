import { GraphQLClient } from 'graphql-request';

// Subgraph endpoint - points directly to the v2-subgraph
const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'http://localhost:8000/subgraphs/name/kalyswap/dex-subgraph';

export const subgraphClient = new GraphQLClient(SUBGRAPH_URL);

// Factory query with correct uppercase address
export const FACTORY_QUERY = `
  query GetFactory {
    kalyswapFactory(id: "0xD42Af909d323D88e0E933B6c50D3e91c279004ca") {
      id
      pairCount
      totalVolumeUSD
      totalLiquidityUSD
      totalVolumeKLC
      totalLiquidityKLC
      txCount
    }
  }
`;

// Pairs query for market data
export const PAIRS_QUERY = `
  query GetPairs($first: Int!, $orderBy: String!, $orderDirection: String!) {
    pairs(first: $first, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      token0 { 
        id 
        symbol 
        decimals 
      }
      token1 { 
        id 
        symbol 
        decimals 
      }
      reserve0
      reserve1
      reserveUSD
      token0Price
      token1Price
      volumeUSD
      txCount
      createdAtTimestamp
      createdAtBlockNumber
    }
  }
`;

// Specific pair query
export const PAIR_QUERY = `
  query GetPair($id: ID!) {
    pair(id: $id) {
      id
      token0 { 
        id 
        symbol 
        decimals 
      }
      token1 { 
        id 
        symbol 
        decimals 
      }
      reserve0
      reserve1
      reserveUSD
      token0Price
      token1Price
      volumeUSD
      txCount
      createdAtTimestamp
      createdAtBlockNumber
    }
  }
`;

// Pair day data query for charts
export const PAIR_DAY_DATA_QUERY = `
  query GetPairDayData($pairAddress: Bytes!, $first: Int!, $skip: Int!) {
    pairDayDatas(
      where: { pairAddress: $pairAddress }
      first: $first
      skip: $skip
      orderBy: date
      orderDirection: desc
    ) {
      id
      date
      pairAddress
      dailyVolumeUSD
      dailyVolumeToken0
      dailyVolumeToken1
      dailyTxns
      reserve0
      reserve1
      reserveUSD
      totalSupply
    }
  }
`;

// Kalyswap day data query
export const KALYSWAP_DAY_DATA_QUERY = `
  query GetKalyswapDayData($first: Int!, $skip: Int!) {
    kalyswapDayDatas(first: $first, skip: $skip, orderBy: date, orderDirection: desc) {
      id
      date
      dailyVolumeUSD
      dailyVolumeKLC
      totalVolumeUSD
      totalVolumeKLC
      totalLiquidityUSD
      totalLiquidityKLC
      txCount
    }
  }
`;

// Token query
export const TOKEN_QUERY = `
  query GetToken($id: ID!) {
    token(id: $id) {
      id
      symbol
      name
      decimals
      totalSupply
      tradeVolume
      tradeVolumeUSD
      txCount
      totalLiquidity
      derivedKLC
    }
  }
`;

// Helper functions for direct subgraph calls
export async function getFactoryData() {
  try {
    const result = await subgraphClient.request(FACTORY_QUERY) as any;
    return result.kalyswapFactory;
  } catch (error) {
    console.error('Error fetching factory data:', error);
    return null;
  }
}

export async function getPairsData(first = 10, orderBy = 'reserveUSD', orderDirection = 'desc') {
  try {
    const result = await subgraphClient.request(PAIRS_QUERY, {
      first,
      orderBy,
      orderDirection
    }) as any;
    return result.pairs;
  } catch (error) {
    console.error('Error fetching pairs data:', error);
    return [];
  }
}

export async function getPairData(pairId: string) {
  try {
    const result = await subgraphClient.request(PAIR_QUERY, { id: pairId }) as any;
    return result.pair;
  } catch (error) {
    console.error('Error fetching pair data:', error);
    return null;
  }
}

export async function getPairDayData(pairAddress: string, first = 30, skip = 0) {
  try {
    const result = await subgraphClient.request(PAIR_DAY_DATA_QUERY, {
      pairAddress,
      first,
      skip
    }) as any;
    return result.pairDayDatas;
  } catch (error) {
    console.error('Error fetching pair day data:', error);
    return [];
  }
}

export async function getKalyswapDayData(first = 7, skip = 0) {
  try {
    const result = await subgraphClient.request(KALYSWAP_DAY_DATA_QUERY, {
      first,
      skip
    }) as any;
    return result.kalyswapDayDatas;
  } catch (error) {
    console.error('Error fetching Kalyswap day data:', error);
    return [];
  }
}

export async function getTokenData(tokenId: string) {
  try {
    const result = await subgraphClient.request(TOKEN_QUERY, { id: tokenId }) as any;
    return result.token;
  } catch (error) {
    console.error('Error fetching token data:', error);
    return null;
  }
}

// Get pair-specific market stats
export async function getPairMarketStats(pairAddress: string) {
  try {
    const [pairData, pairDayData] = await Promise.all([
      getPairData(pairAddress),
      getPairDayData(pairAddress, 2, 0) // Get last 2 days for 24h comparison
    ]);

    if (!pairData) {
      return null;
    }

    // Calculate 24h volume and price change
    let volume24h = 0;
    let priceChange24h = 0;

    if (pairDayData && pairDayData.length >= 2) {
      const today = pairDayData[0];
      const yesterday = pairDayData[1];

      volume24h = parseFloat(today.dailyVolumeUSD || '0');

      // Calculate price change based on reserves
      if (yesterday.reserve0 && yesterday.reserve1 && pairData.reserve0 && pairData.reserve1) {
        const yesterdayPrice = parseFloat(yesterday.reserve1) / parseFloat(yesterday.reserve0);
        const todayPrice = parseFloat(pairData.reserve1) / parseFloat(pairData.reserve0);
        priceChange24h = ((todayPrice - yesterdayPrice) / yesterdayPrice) * 100;
      }
    }

    return {
      pair: pairData,
      volume24h,
      priceChange24h,
      liquidity: parseFloat(pairData.reserveUSD || '0')
    };
  } catch (error) {
    console.error('Error fetching pair market stats:', error);
    return null;
  }
}
