# TradingView Lightweight Charts Integration

## Overview

This directory contains the TradingView Lightweight Charts integration for KalySwap. The implementation provides professional-grade financial charts with real-time price data, multiple chart types, and interactive features.

## Components

### `TradingChart.tsx`
The main chart component that renders TradingView Lightweight Charts with the following features:

#### **Features**
- **Chart Types**: Candlestick and Line charts
- **Timeframes**: 15m, 1H, 4H, 1D, 1W intervals
- **Volume Indicators**: Volume bars for candlestick charts
- **Real-time Updates**: Live price data updates
- **Interactive Controls**: Zoom, pan, crosshair
- **Responsive Design**: Mobile and desktop optimized
- **Error Handling**: Graceful error states with retry functionality

#### **Props**
```typescript
interface ChartProps {
  symbol?: string;        // Base token symbol (e.g., 'KLC')
  baseSymbol?: string;    // Quote token symbol (e.g., 'USDT')
  height?: number;        // Chart height in pixels
  showTimeframes?: boolean; // Show timeframe selector
  showChartTypes?: boolean; // Show chart type selector
  className?: string;     // Additional CSS classes
}
```

#### **Usage**
```tsx
import TradingChart from '@/components/charts/TradingChart';

<TradingChart
  symbol="KLC"
  baseSymbol="USDT"
  height={600}
  showTimeframes={true}
  showChartTypes={true}
  className="w-full"
/>
```

## Hooks

### `usePriceData.ts`
Custom React hooks for fetching and managing price data:

#### **`usePriceData(pair, timeframe)`**
Main hook for fetching OHLCV data for chart display.

**Parameters:**
- `pair`: `{ baseToken: string, quoteToken: string }`
- `timeframe`: `string` (e.g., '1h', '4h', '1d')

**Returns:**
```typescript
{
  priceData: PricePoint[];     // OHLCV data array
  currentPrice: number | null; // Latest price
  priceChange24h: number | null; // 24h price change %
  volume24h: number | null;    // 24h volume
  isLoading: boolean;          // Loading state
  error: string | null;        // Error message
  refreshData: () => void;     // Manual refresh function
}
```

#### **`useTokenPrice(symbol)`**
Simplified hook for getting current token price.

**Parameters:**
- `symbol`: `string` - Token symbol

**Returns:**
```typescript
{
  price: number | null;        // Current price
  change24h: number | null;    // 24h change %
  isLoading: boolean;          // Loading state
}
```

## Data Structure

### **PricePoint Interface**
```typescript
interface PricePoint {
  time: number;    // Unix timestamp
  open: number;    // Opening price
  high: number;    // Highest price
  low: number;     // Lowest price
  close: number;   // Closing price
  volume: number;  // Trading volume
}
```

## Chart Configuration

### **TradingView Settings**
The chart is configured with professional trading interface settings:

```typescript
const chartOptions = {
  layout: {
    background: { type: ColorType.Solid, color: 'transparent' },
    textColor: '#374151',
    fontSize: 12,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  grid: {
    vertLines: { color: '#f3f4f6', style: LineStyle.Solid },
    horzLines: { color: '#f3f4f6', style: LineStyle.Solid },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: { color: '#9ca3af', width: 1, style: LineStyle.Dashed },
    horzLine: { color: '#9ca3af', width: 1, style: LineStyle.Dashed },
  },
  rightPriceScale: {
    borderColor: '#e5e7eb',
    scaleMargins: { top: 0.1, bottom: 0.1 },
    mode: PriceScaleMode.Normal,
  },
  timeScale: {
    borderColor: '#e5e7eb',
    timeVisible: true,
    secondsVisible: false,
    rightOffset: 12,
    barSpacing: 8,
    minBarSpacing: 4,
  },
};
```

### **Series Configuration**

#### **Candlestick Series**
```typescript
const candlestickSeries = chart.addCandlestickSeries({
  upColor: '#10b981',      // Green for bullish candles
  downColor: '#ef4444',    // Red for bearish candles
  borderDownColor: '#ef4444',
  borderUpColor: '#10b981',
  wickDownColor: '#ef4444',
  wickUpColor: '#10b981',
  priceFormat: {
    type: 'price',
    precision: symbol === 'KLC' ? 8 : 4,
    minMove: symbol === 'KLC' ? 0.00000001 : 0.0001,
  },
});
```

#### **Volume Series**
```typescript
const volumeSeries = chart.addHistogramSeries({
  color: '#e5e7eb',
  priceFormat: { type: 'volume' },
  priceScaleId: 'volume',
  scaleMargins: { top: 0.7, bottom: 0 },
});
```

## Mock Data

Currently using mock data for demonstration. The data generation includes:

- **Realistic Price Movement**: ±5% base variation with 2% volatility
- **OHLC Logic**: Proper high/low calculations based on open/close
- **Volume Data**: Random volume between 0-1M for each period
- **Time Series**: 100 data points with hourly intervals
- **Real-time Updates**: Price updates every 5 seconds

## Integration Points

### **Future DEX Integration**
The hooks are designed to easily integrate with real DEX data:

```typescript
// Replace mock data with actual API calls
const response = await fetch(`/api/price-data?base=${pair.baseToken}&quote=${pair.quoteToken}&timeframe=${timeframe}`);
const data = await response.json();
```

### **Subgraph Integration**
Ready for GraphQL subgraph integration:

```typescript
const PRICE_DATA_QUERY = gql`
  query GetPriceData($pair: String!, $timeframe: String!, $limit: Int!) {
    priceCandles(
      where: { pair: $pair }
      orderBy: timestamp
      orderDirection: desc
      first: $limit
    ) {
      timestamp
      open
      high
      low
      close
      volume
    }
  }
`;
```

## Performance Optimizations

1. **Lazy Loading**: Chart only renders when visible
2. **Data Memoization**: Price data cached to prevent unnecessary re-renders
3. **Efficient Updates**: Only updates changed data points
4. **Memory Management**: Proper cleanup of chart instances
5. **Bundle Size**: Lightweight Charts is only 45KB gzipped

## Browser Support

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+

## Dependencies

```json
{
  "lightweight-charts": "^4.1.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0"
}
```

## Styling

The component uses Tailwind CSS for styling and is fully responsive. Custom CSS is minimal and focused on chart-specific styling.

## Error Handling

- **Network Errors**: Graceful fallback with retry button
- **Data Validation**: Validates price data format
- **Chart Errors**: Handles chart initialization failures
- **Loading States**: Proper loading indicators

## Future Enhancements

1. **Technical Indicators**: RSI, MACD, Moving Averages
2. **Drawing Tools**: Trend lines, support/resistance levels
3. **Order Book Integration**: Depth chart overlay
4. **Trade Execution**: Direct trading from chart
5. **Multiple Pairs**: Compare different token pairs
6. **Export Features**: Save chart images, export data

The TradingView integration provides a solid foundation for professional trading interfaces and can be easily extended with additional features as needed.
