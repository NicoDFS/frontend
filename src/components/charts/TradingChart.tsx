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
import { usePriceData, formatTokenPrice, formatPriceChange } from '@/hooks/usePriceData';

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

  // Check if this is KLC/USDT pair (only supported pair for now)
  const isKlcUsdtPair = (symbol === 'KLC' || symbol === 'wKLC') && (baseSymbol === 'USDT' || baseSymbol === 'USDt');

  console.log('TradingChart props:', { symbol, baseSymbol, isKlcUsdtPair });

  // Use the price data hook only for KLC/USDT
  const {
    priceData,
    currentPrice,
    priceChange24h,
    volume24h,
    isLoading,
    error,
    refreshData,
  } = usePriceData({ baseToken: symbol, quoteToken: baseSymbol }, selectedTimeframe);

  // Show "Coming Soon" for non-KLC/USDT pairs
  if (!isKlcUsdtPair) {
    return (
      <div className={`bg-white rounded-lg border ${className}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {symbol}/{baseSymbol}
            </h3>
          </div>
        </div>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Live Chart Coming Soon</h3>
            <p className="text-gray-500 max-w-sm">
              Advanced trading charts for {symbol}/{baseSymbol} will be available shortly
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

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
        rightOffset: 2,
        barSpacing: 8,
        minBarSpacing: 4,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

      chart.timeScale().fitContent();
      chartRef.current = chart;

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: height,
          });
        }
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chart) {
          chart.remove();
        }
      };
    } catch (error) {
      console.error('Failed to initialize chart:', error);
    }
  }, [height]);

  // Update chart data and series type
  useEffect(() => {
    if (!chartRef.current || !priceData.length) return;

    // Remove existing series
    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
    }

    // Convert price data to chart format
    const chartData = priceData.map(item => ({
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
          precision: symbol === 'KLC' ? 8 : 4,
          minMove: symbol === 'KLC' ? 0.00000001 : 0.0001,
        },
      });

      candlestickSeries.setData(chartData);
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

      const volumeData = chartData.map(item => ({
        time: item.time,
        value: item.volume || 0,
        color: item.close >= item.open ? '#10b98150' : '#ef444450',
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
        drawTicks: false,
        borderVisible: false,
      });

    } else {
      const lineSeries = chartRef.current.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: symbol === 'KLC' ? 8 : 4,
          minMove: symbol === 'KLC' ? 0.00000001 : 0.0001,
        },
      });

      const lineData: LineData[] = chartData.map(item => ({
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

  }, [selectedChartType, selectedTimeframe, symbol, baseSymbol, priceData]);

  // Handle error display
  if (error) {
    return (
      <div className={`bg-white rounded-lg border ${className}`}>
        <div className="p-8 text-center">
          <div className="text-red-500 mb-2">Failed to load chart data</div>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
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
              {symbol}/{baseSymbol}
            </h3>
            {currentPrice && (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900">
                  ${formatTokenPrice(currentPrice, symbol)}
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
            <Button onClick={refreshData} variant="ghost" size="sm" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
        {isLoading && (
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
