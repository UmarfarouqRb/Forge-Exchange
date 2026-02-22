
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MarketRow } from '@/components/MarketRow';
import { TradingPair } from '@/types';
import { Market } from '@/types/market-data';
import { subscribe, unsubscribe } from '@/lib/ws/market';
import { getAllPairs, getMarkets } from '@/lib/api';

export default function MarketPage() {
  const [pairsList, setPairsList] = useState<TradingPair[]>([]);
  const [markets, setMarkets] = useState<Map<string, Market>>(new Map());
  const [isErrorPairs, setIsErrorPairs] = useState(false);

  useEffect(() => {
    const fetchTradingPairs = async () => {
      setIsErrorPairs(false);
      try {
        const data = await getAllPairs();
        setPairsList(data);
      } catch (error) {
        console.error("Failed to fetch trading pairs:", error);
        setIsErrorPairs(true);
      }
    };

    fetchTradingPairs();
  }, []);

  useEffect(() => {
    if (pairsList.length === 0) return;

    const fetchMarketData = async () => {
      try {
        const data = await getMarkets();
        const newMarkets = new Map<string, Market>();
        data.forEach((market: Market) => {
          if (market.symbol) {
            newMarkets.set(market.symbol, market);
          }
        });
        setMarkets(newMarkets);
      } catch (error) {
        console.error("Failed to fetch market data:", error);
      }
    };

    fetchMarketData();

    const handlePriceUpdate = (data: { topic: string; price: number }) => {
      const symbol = data.topic.split(':')[1];
      const pair = pairsList.find(p => p.symbol === symbol);
      if (!pair) return;

      setMarkets(prevMarkets => {
        const newMarkets = new Map(prevMarkets);
        const existingMarket = newMarkets.get(symbol);
        if (existingMarket) {
          const updatedMarket = { ...existingMarket, currentPrice: String(data.price) };
          newMarkets.set(symbol, updatedMarket);
        } else {
          newMarkets.set(symbol, { id: pair.id, currentPrice: String(data.price), symbol: symbol });
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
  }, [pairsList]);

  const renderContent = () => {
    if (isErrorPairs) {
      return (
        <div className="p-4 text-center text-destructive">Error loading trading pairs. Please try again later.</div>
      );
    }

    if (pairsList.length === 0 && !isErrorPairs) {
      return (
        <div className="p-4 text-center text-muted-foreground">No trading pairs available.</div>
      );
    }

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
        <Card className="border-border/50 overflow-.hidden">
          <CardContent className="p-0">
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
