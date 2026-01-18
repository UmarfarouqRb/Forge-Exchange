import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { FiSearch } from 'react-icons/fi';

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: Record<string, unknown>) => void;
    };
  }
}

const spotSymbols = ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT', 'BINANCE:TRUMPUSDT'];
const futuresSymbols = ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT'];
const allSymbols = [...new Set([...spotSymbols, ...futuresSymbols])];

export default function Market() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [category, setCategory] = useState<'all' | 'spot' | 'futures'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const symbols = useMemo(() => {
    let baseSymbols;
    if (category === 'spot') {
      baseSymbols = spotSymbols;
    } else if (category === 'futures') {
      baseSymbols = futuresSymbols;
    } else {
      baseSymbols = allSymbols;
    }
    if (!debouncedSearchQuery) return baseSymbols;
    return baseSymbols.filter(s => s.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
  }, [category, debouncedSearchQuery]);

  useEffect(() => {
    setIsLoading(true);
    const widgetContainer = document.getElementById('tradingview-widget-market');

    if (symbols.length === 0) {
      if (widgetContainer) {
        widgetContainer.innerHTML = '';
      }
      setIsLoading(false);
      return;
    }
    
    if (widgetContainer) {
      widgetContainer.innerHTML = '';

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        width: '100%',
        height: 700,
        defaultColumn: 'overview',
        screener_type: 'crypto_mkt',
        displayCurrency: 'USD',
        colorTheme: 'dark',
        locale: 'en',
        isTransparent: true,
        showToolbar: false,
        "symbols": {
          "proNames": symbols,
        },
        "tabs": [],
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
  }, [symbols]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-foreground">Markets</h1>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <Tabs value={category} onValueChange={(v) => setCategory(v as 'all' | 'spot' | 'futures')}>
                <TabsList>
                  <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                  <TabsTrigger value="spot" data-testid="tab-spot">Spot</TabsTrigger>
                  <TabsTrigger value="futures" data-testid="tab-futures">Futures</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative w-full sm:w-auto sm:max-w-xs">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-pairs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="tradingview-widget-container" id="tradingview-widget-market">
              {(isLoading || symbols.length === 0) && (
                <div className="h-[700px] w-full flex items-center justify-center">
                  {symbols.length === 0 && !isLoading ? (
                     <p className="text-muted-foreground">No symbols match your search.</p>
                  ) : (
                    <Skeleton className="h-[700px] w-full" />
                  )}
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