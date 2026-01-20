import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: Record<string, unknown>) => void;
    };
  }
}

const symbols = [
    'BINANCE:BTCUSDT',
    'BINANCE:ETHUSDT',
    'BINANCE:SOLUSDT',
    'BINANCE:XRPUSDT'
];

export default function Market() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const widgetContainer = document.getElementById('tradingview-widget-market');

    if (widgetContainer) {
      widgetContainer.innerHTML = '';

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        width: '100%',
        height: 700,
        defaultColumn: 'overview',
        displayCurrency: 'USD',
        colorTheme: 'dark',
        locale: 'en',
        isTransparent: true,
        showToolbar: false,
        "symbols": {
          "proNames": symbols,
        },
      });

      widgetContainer.appendChild(script);
      script.onload = () => setIsLoading(false);
    } else {
      setIsLoading(false);
    }

    return () => {
      if (widgetContainer) {
        widgetContainer.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-foreground">Markets</h1>

        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="tradingview-widget-container" id="tradingview-widget-market">
              {isLoading && (
                <div className="h-[700px] w-full flex items-center justify-center">
                  <Skeleton className="h-[700px] w-full" />
                </div>
              )}
              <div className="tradingview-widget-container__widget"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}