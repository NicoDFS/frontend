'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  PriceScaleMode,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  Time,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, BarChart3, Maximize2, RefreshCw } from 'lucide-react';
import { useHistoricalPriceData, formatTokenPrice, formatPriceChange } from '@/hooks/usePriceData';
import { usePriceDataContext } from '@/contexts/PriceDataContext';

// Token interface
interface Token {
  chainId: number;
  address: string;
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  isNative?: boolean;
}

// Chart data interfaces
interface PriceData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ChartProps {
  tokenA?: Token | null;
  tokenB?: Token | null;
  // Legacy props for backward compatibility
  symbol?: string;
  baseSymbol?: string;
  height?: number;
  showTimeframes?: boolean;
  showChartTypes?: boolean;
  className?: string;
}

// Time period options
const TIME_PERIODS = [
  { label: '15m', value: '15m', seconds: 900 },
  { label: '1H', value: '1h', seconds: 3600 },
  { label: '4H', value: '4h', seconds: 14400 },
  { label: '1D', value: '1d', seconds: 86400 },
  { label: '1W', value: '1w', seconds: 604800 },
];

// Chart type options
const CHART_TYPES = [
  { label: 'Candlestick', value: 'candlestick', icon: BarChart3 },
  { label: 'Line', value: 'line', icon: TrendingUp },
];

// Generate mock price data for demonstration
const generateMockData = (symbol: string = 'KLC', baseSymbol: string = 'USDT'): PriceData[] => {
  const data: PriceData[] = [];
  const now = Math.floor(Date.now() / 1000);
  const basePrice = symbol === 'KLC' ? 0.0003 : 1.0;

  // Generate 100 data points (last 100 periods)
  for (let i = 99; i >= 0; i--) {
    const time = (now - (i * 3600)) as Time; // 1 hour intervals
    const randomFactor = 0.95 + Math.random() * 0.1; // ±5% variation
    const price = basePrice * randomFactor;
    const volatility = 0.02; // 2% volatility

    const open = price;
    const close = price * (0.98 + Math.random() * 0.04); // ±2% from open
    const high = Math.max(open, close) * (1 + Math.random() * volatility);
    const low = Math.min(open, close) * (1 - Math.random() * volatility);

    data.push({
      time,
      open: parseFloat(open.toFixed(8)),
      high: parseFloat(high.toFixed(8)),
      low: parseFloat(low.toFixed(8)),
      close: parseFloat(close.toFixed(8)),
      volume: Math.floor(Math.random() * 1000000),
    });
  }

  return data;
};

export default function TradingChart({
  tokenA,
  tokenB,
  // Legacy props for backward compatibility
  symbol = 'KLC',
  baseSymbol = 'USDT',
  height = 400,
  showTimeframes = true,
  showChartTypes = true,
  className = '',
}: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);

  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [selectedChartType, setSelectedChartType] = useState('candlestick');

  // Use Token objects if provided, otherwise fall back to legacy string props
  const currentTokenA = tokenA || (symbol ? { symbol, chainId: 3888, address: '', decimals: 18, name: symbol, logoURI: '' } as Token : null);
  const currentTokenB = tokenB || (baseSymbol ? { symbol: baseSymbol, chainId: 3888, address: '', decimals: 18, name: baseSymbol, logoURI: '' } as Token : null);

  // Fetch real historical price data from DEX subgraph
  const {
    priceData: historicalData,
    isLoading: dataLoading,
    error: dataError,
    refetch: refetchData
  } = useHistoricalPriceData(currentTokenA, currentTokenB);

  console.log('🎯 TradingChart Debug:', {
    tokenA: currentTokenA?.symbol,
    tokenB: currentTokenB?.symbol,
    tokenAAddress: currentTokenA?.address,
    tokenBAddress: currentTokenB?.address,
    dataLoading,
    dataError,
    historicalDataLength: historicalData.length,
    historicalData: historicalData.slice(0, 2), // Show first 2 items
    timestamp: new Date().toISOString()
  });

  // Use real historical data from subgraph
  const chartData = React.useMemo(() => {
    return historicalData;
  }, [historicalData]);

  // Calculate current price and stats from latest data point
  const currentPrice = React.useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData[historicalData.length - 1].close;
    }
    return 0;
  }, [historicalData]);

  const { setPriceChange24h: setSharedPriceChange } = usePriceDataContext();

  const priceChange24h = React.useMemo(() => {
    if (historicalData.length >= 2) {
      const latest = historicalData[historicalData.length - 1];
      const previous = historicalData[historicalData.length - 2];
      const change = ((latest.close - previous.close) / previous.close) * 100;
      return change;
    }
    return 0;
  }, [historicalData]);

  // Update shared context in useEffect to avoid render phase setState
  React.useEffect(() => {
    setSharedPriceChange(priceChange24h);
  }, [priceChange24h, setSharedPriceChange]);

  const volume24h = React.useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData[historicalData.length - 1].volume || 0;
    }
    return 0;
  }, [historicalData]);

  // Initialize chart only when we have data and container will be rendered
  useEffect(() => {
    // Only initialize if we're not loading, have no errors, and have data
    const shouldInitialize = !dataLoading && !dataError && historicalData.length > 0;

    console.log('🎯 Chart initialization effect:', {
      hasContainer: !!chartContainerRef.current,
      hasTokens: !!(currentTokenA && currentTokenB),
      hasExistingChart: !!chartRef.current,
      shouldInitialize,
      dataLoading,
      dataError: !!dataError,
      dataLength: historicalData.length
    });

    if (!shouldInitialize) {
      console.log('⚠️ Chart initialization skipped: conditions not met');
      return;
    }

    if (!chartContainerRef.current) {
      console.log('⚠️ Chart initialization skipped: no container');
      return;
    }

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#374151',
          fontSize: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        grid: {
          vertLines: {
            color: '#f3f4f6',
            style: LineStyle.Solid,
          },
          horzLines: {
            color: '#f3f4f6',
            style: LineStyle.Solid,
          },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: '#9ca3af',
            width: 1,
            style: LineStyle.Dashed,
          },
          horzLine: {
            color: '#9ca3af',
            width: 1,
            style: LineStyle.Dashed,
          },
        },
        rightPriceScale: {
          borderColor: '#e5e7eb',
          scaleMargins: {
            top: 0.05,
            bottom: 0.1,
          },
          mode: PriceScaleMode.Normal,
        },
        leftPriceScale: {
          visible: false,
        },
        timeScale: {
          borderColor: '#e5e7eb',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      chartRef.current = chart;
      console.log('✅ Chart initialized successfully');

      return () => {
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }
      };
    } catch (error) {
      console.error('Failed to initialize chart:', error);
    }
  }, [dataLoading, dataError, historicalData.length]);

  // Update chart data when data changes
  useEffect(() => {
    console.log('📊 Chart data update effect:', {
      hasChartRef: !!chartRef.current,
      hasTokens: !!(currentTokenA && currentTokenB),
      chartDataLength: chartData.length,
      chartData: chartData.slice(0, 2)
    });

    if (!chartRef.current || chartData.length === 0) {
      console.log('⚠️ Chart update skipped:', {
        hasChartRef: !!chartRef.current,
        chartDataLength: chartData.length
      });
      return;
    }

    // Remove existing series
    if (seriesRef.current && chartRef.current) {
      try {
        chartRef.current.removeSeries(seriesRef.current);
      } catch (error) {
        console.warn('Error removing chart series:', error);
      }
      seriesRef.current = null;
    }

    // Use the historical data from subgraph (already in correct format)
    const formattedChartData = chartData.map(item => ({
      time: item.time as Time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }));

    // Create new series based on chart type
    if (selectedChartType === 'candlestick') {
      const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#10b981',
        wickDownColor: '#ef4444',
        wickUpColor: '#10b981',
        priceFormat: {
          type: 'price',
          precision: (currentTokenA?.symbol === 'KLC' || currentTokenA?.symbol === 'wKLC') ? 8 : 4,
          minMove: (currentTokenA?.symbol === 'KLC' || currentTokenA?.symbol === 'wKLC') ? 0.00000001 : 0.0001,
        },
      });

      candlestickSeries.setData(formattedChartData);
      seriesRef.current = candlestickSeries;

      // Add volume series for candlestick charts
      const volumeSeries = chartRef.current.addSeries(HistogramSeries, {
        color: '#e5e7eb',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
        lastValueVisible: false,
        priceLineVisible: false,
      });

      const volumeData = formattedChartData.map(item => ({
        time: item.time,
        value: item.volume || 0,
        color: item.close >= item.open ? '#10b981' : '#ef4444',
      }));

      volumeSeries.setData(volumeData);

      // Configure volume price scale after series is created
      chartRef.current.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
        mode: PriceScaleMode.Normal,
        visible: false,
        borderVisible: false,
      });

    } else {
      const lineSeries = chartRef.current.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: (currentTokenA?.symbol === 'KLC' || currentTokenA?.symbol === 'wKLC') ? 8 : 4,
          minMove: (currentTokenA?.symbol === 'KLC' || currentTokenA?.symbol === 'wKLC') ? 0.00000001 : 0.0001,
        },
      });

      const lineData: LineData[] = formattedChartData.map(item => ({
        time: item.time,
        value: item.close,
      }));

      lineSeries.setData(lineData);
      seriesRef.current = lineSeries;
    }

    // Fit content after data is loaded
    setTimeout(() => {
      chartRef.current?.timeScale().fitContent();
    }, 100);

  }, [selectedChartType, selectedTimeframe, currentTokenA, currentTokenB, chartData]);

  console.log('TradingChart props:', {
    tokenA: currentTokenA?.symbol,
    tokenB: currentTokenB?.symbol,
    dataLoading,
    historicalDataLength: historicalData.length
  });

  // Show loading state while fetching data
  if (dataLoading) {
    return (
      <div className={`bg-white rounded-lg border ${className}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {currentTokenA?.symbol || 'TOKEN1'}/{currentTokenB?.symbol || 'TOKEN2'}
            </h3>
          </div>
        </div>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading chart data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if data fetch failed
  if (dataError) {
    return (
      <div className={`bg-white rounded-lg border ${className}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {currentTokenA?.symbol || 'TOKEN1'}/{currentTokenB?.symbol || 'TOKEN2'}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={refetchData}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Chart Data</h3>
            <p className="text-gray-500 max-w-sm">
              {dataError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show "No data" message if no chart data and no loading
  if (!dataLoading && historicalData.length === 0) {
    const isLiquidityError = dataError?.includes('No liquidity pool exists');

    return (
      <div className={`bg-white rounded-lg border ${className}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {currentTokenA?.symbol || 'TOKEN1'}/{currentTokenB?.symbol || 'TOKEN2'}
            </h3>
          </div>
        </div>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isLiquidityError ? 'No Liquidity Pool' : 'No Chart Data Available'}
            </h3>
            <p className="text-gray-500 max-w-sm">
              {isLiquidityError
                ? `No liquidity pool exists for ${currentTokenA?.symbol}/${currentTokenB?.symbol}. This pair is not available for trading.`
                : `Chart data for ${currentTokenA?.symbol || 'TOKEN1'}/${currentTokenB?.symbol || 'TOKEN2'} is not available`
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Chart Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {currentTokenA?.symbol || 'TOKEN1'}/{currentTokenB?.symbol || 'TOKEN2'}
            </h3>
            {currentPrice && (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900">
                  ${formatTokenPrice(currentPrice, currentTokenA?.symbol || 'TOKEN1')}
                </span>
                {priceChange24h !== null && (
                  <span
                    className={`text-sm font-medium px-2 py-1 rounded ${
                      priceChange24h >= 0
                        ? 'text-green-700 bg-green-100'
                        : 'text-red-700 bg-red-100'
                    }`}
                  >
                    {formatPriceChange(priceChange24h)}
                  </span>
                )}
              </div>
            )}
            {volume24h && (
              <div className="text-sm text-gray-600">
                24h Volume: {volume24h.toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={refetchData} variant="ghost" size="sm" disabled={dataLoading}>
              <RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex items-center gap-4">
          {showChartTypes && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Type:</span>
              <Select value={selectedChartType} onValueChange={setSelectedChartType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-3 w-3" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showTimeframes && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Timeframe:</span>
              <div className="flex gap-1">
                {TIME_PERIODS.map((period) => (
                  <Button
                    key={period.value}
                    variant={selectedTimeframe === period.value ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedTimeframe(period.value)}
                    className="h-7 px-2 text-xs"
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {dataLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading chart...</span>
            </div>
          </div>
        )}
        <div
          ref={chartContainerRef}
          style={{ height: `${height}px` }}
          className="w-full"
        />
      </div>
    </div>
  );
}
