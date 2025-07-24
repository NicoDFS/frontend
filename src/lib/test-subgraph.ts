// Test file to verify direct subgraph connection
import { getFactoryData, getPairsData, getPairData } from './subgraph-client';

export async function testSubgraphConnection() {
  console.log('🧪 Testing direct subgraph connection...');
  
  try {
    // Test 1: Factory data
    console.log('📊 Testing factory data...');
    const factoryData = await getFactoryData();
    console.log('Factory data:', factoryData);
    
    // Test 2: Pairs data
    console.log('📈 Testing pairs data...');
    const pairsData = await getPairsData(5);
    console.log('Pairs data:', pairsData);
    
    // Test 3: Specific WKLC/USDT pair
    console.log('💰 Testing WKLC/USDT pair...');
    const wklcUsdtPair = await getPairData('0x25fddaf836d12dc5e285823a644bb86e0b79c8e2');
    console.log('WKLC/USDT pair:', wklcUsdtPair);
    
    // Calculate KLC price from WKLC/USDT pair
    if (wklcUsdtPair) {
      const reserve0 = parseFloat(wklcUsdtPair.reserve0);
      const reserve1 = parseFloat(wklcUsdtPair.reserve1);
      
      let klcPrice = 0;
      if (wklcUsdtPair.token0.symbol === 'WKLC') {
        klcPrice = reserve1 / reserve0; // USDT / WKLC
        console.log(`💵 KLC Price: $${klcPrice.toFixed(6)} (${reserve1} USDT / ${reserve0} WKLC)`);
      } else {
        klcPrice = reserve0 / reserve1; // USDT / WKLC  
        console.log(`💵 KLC Price: $${klcPrice.toFixed(6)} (${reserve0} USDT / ${reserve1} WKLC)`);
      }
    }
    
    console.log('✅ Direct subgraph connection test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Direct subgraph connection test failed:', error);
    return false;
  }
}
