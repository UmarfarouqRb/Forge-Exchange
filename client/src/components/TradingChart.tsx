import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];

interface TradingChartProps {
  symbol: string;
}

let chartIdCounter = 0;
let tradingViewScriptPromise: Promise<void> | null = null;

function loadTradingViewScript(): Promise<void> {
  if (tradingViewScriptPromise) {
    return tradingViewScriptPromise;
  }

  if ((window as any).TradingView) {
    return Promise.resolve();
  }

  tradingViewScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load TradingView script'));
    document.head.appendChild(script);
  });

  return tradingViewScriptPromise;
}

export function TradingChart({ symbol }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartId] = useState(() => `tradingview_chart_${++chartIdCounter}`);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeChart = async () => {
      try {
        await loadTradingViewScript();
        
        if (!isMounted || !containerRef.current || !(window as any).TradingView) {
          return;
        }

        // Clean up previous widget if it exists
        if (widgetRef.current) {
          widgetRef.current = null;
        }

        widgetRef.current = new (window as any).TradingView.widget({
          autosize: true,
          symbol: `BINANCE:${symbol}`,
          interval: '60',
          timezone: 'Etc/UTC',
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          style: '1',
          locale: 'en',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: chartId,
          toolbar_bg: 'hsl(var(--card))',
          allow_symbol_change: true,
        });
      } catch (error) {
        console.error('Failed to initialize TradingView chart:', error);
      }
    };

    initializeChart();

    return () => {
      isMounted = false;
      if (widgetRef.current && widgetRef.current.remove) {
        widgetRef.current.remove();
      }
      widgetRef.current = null;
    };
  }, [symbol, chartId]);

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Timeframe Selector */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold font-mono" data-testid="text-chart-symbol">
              {symbol}
            </span>
            <span className="text-sm text-muted-foreground">Live Chart</span>
          </div>
          <div className="flex gap-1">
            {timeframes.map((tf) => (
              <Button
                key={tf}
                variant={tf === '1h' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                data-testid={`button-timeframe-${tf}`}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>

        {/* TradingView Chart */}
        <div className="flex-1 min-h-0" ref={containerRef}>
          <div id={chartId} className="h-full w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
