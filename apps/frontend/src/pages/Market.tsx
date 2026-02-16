import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MarketRow } from '@/components/MarketRow';
import { TradingPair } from '@/types';
import { Market } from '@/types/market-data';
import { subscribe, unsubscribe } from '@/lib/ws/market';
import { getAllPairs, getMarkets } from '@/lib/api'; // Removed getCachedMarkets

export default function MarketPage() {
  const [pairsList, setPairsList] = useState<TradingPair[]>([]);
  const [markets, setMarkets] = useState<Map<string, Market>>(new Map());
  const [isLoadingPairs, setIsLoadingPairs] = useState(true);
  const [isErrorPairs, setIsErrorPairs] = useState(false);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  const [isErrorMarkets, setIsErrorMarkets] = useState(false);

  useEffect(() => {
    const fetchTradingPairs = async () => {
      setIsLoadingPairs(true);
      setIsErrorPairs(false);
      try {
        const data = await getAllPairs();
        setPairsList(data);
      } catch (error) {
        console.error("Failed to fetch trading pairs:", error);
        setIsErrorPairs(true);
      } finally {
        setIsLoadingPairs(false);
      }
    };

    fetchTradingPairs();
  }, []);

  useEffect(() => {
    if (pairsList.length === 0 && !isLoadingPairs && !isErrorPairs) {
      // If pairsList is empty after loading (and no error), there's nothing to fetch for markets.
      setIsLoadingMarkets(false);
      return;
    }
    if (pairsList.length === 0) {
      return;
    }

    const fetchMarketData = async () => {
      setIsLoadingMarkets(true);
      setIsErrorMarkets(false);

      // Removed attempt to load cached data immediately.
      // Rely on getMarkets() which incorporates caching logic on the backend.
      try {
        const data = await getMarkets();
        const newMarkets = new Map<string, Market>();
        data.forEach((market: Market) => { // Explicitly typed market as Market
          if (market.symbol) { // Ensure symbol exists before setting
            newMarkets.set(market.symbol, market);
          }
        });
        setMarkets(newMarkets);
      } catch (error) {
        console.error("Failed to fetch market data:", error);
        setIsErrorMarkets(true);
      } finally {
        setIsLoadingMarkets(false);
      }
    };

    fetchMarketData();

    const handlePriceUpdate = (data: { topic: string; price: number }) => {
      const symbol = data.topic.split(':')[1];
      setMarkets(prevMarkets => {
        const newMarkets = new Map(prevMarkets);
        const existingMarket = newMarkets.get(symbol);
        if (existingMarket) {
          const updatedMarket = { ...existingMarket, currentPrice: String(data.price) };
          newMarkets.set(symbol, updatedMarket);
        }
        return newMarkets;
      });
    };

    pairsList.forEach(pair => {
      const topic = `prices:${pair.symbol}`;
      subscribe(topic, handlePriceUpdate);
    });

    return () => {
      pairsList.forEach(pair => {
        const topic = `prices:${pair.symbol}`;
        unsubscribe(topic);
      });
    };
  }, [pairsList, isLoadingPairs, isErrorPairs]);

  const renderContent = () => {
    if (isLoadingPairs) {
      return (
        <div className="p-4 text-center text-muted-foreground">Loading trading pairs...</div>
      );
    }

    if (isErrorPairs) {
      return (
        <div className="p-4 text-center text-destructive">Error loading trading pairs. Please try again later.</div>
      );
    }

    if (pairsList.length === 0) {
      return (
        <div className="p-4 text-center text-muted-foreground">No trading pairs available.</div>
      );
    }

    if (isLoadingMarkets && markets.size === 0) { // Only show full loading skeleton if no cached markets are displayed
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pair</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">24h Change</TableHead>
              <TableHead className="text-right">24h High</TableHead>
              <TableHead className="text-right">24h Low</TableHead>
              <TableHead className="text-right">24h Volume</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(10)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (isErrorMarkets && markets.size === 0) { // Only show error if no cached markets are displayed
      return (
        <div className="p-4 text-center text-destructive">Error loading market data. Please try again later.</div>
      );
    }

    // If markets are loading but we have cached data, display cached data
    // If markets are not loading, display the current market data (fresh or cached)
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pair</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">24h Change</TableHead>
            <TableHead className="text-right">24h High</TableHead>
            <TableHead className="text-right">24h Low</TableHead>
            <TableHead className="text-right">24h Volume</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pairsList.map((pair) => (
            <MarketRow key={pair.symbol} pair={pair} market={markets.get(pair.symbol)} />
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-foreground">Markets</h1>
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}