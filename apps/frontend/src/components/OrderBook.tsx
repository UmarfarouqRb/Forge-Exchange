import { Skeleton } from '@/components/ui/skeleton';
import { Market, TradingPair } from '@/types/market-data';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface OrderBookProps {
  pair?: TradingPair;
  book?: Market;
}

export function OrderBookSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent>
        {Array.from({ length: 10 }).map((_, i: number) => (
          <Skeleton key={i} className="h-6 w-full mb-1" />
        ))}
      </CardContent>
    </Card>
  );
}

export function OrderBook({ pair, book }: OrderBookProps) {
  const bids = book?.bids || [];
  const asks = book?.asks || [];
  const baseAsset = pair?.base?.symbol;
  const quoteAsset = pair?.quote?.symbol;

  const cumulativeBids = useMemo(() => {
    let cumulativeAmount = 0;
    return bids.map(([price, amount]) => {
      cumulativeAmount += parseFloat(amount);
      return [price, amount, cumulativeAmount];
    });
  }, [bids]);

  const cumulativeAsks = useMemo(() => {
    let cumulativeAmount = 0;
    return asks.map(([price, amount]) => {
      cumulativeAmount += parseFloat(amount);
      return [price, amount, cumulativeAmount];
    });
  }, [asks]);

  if (!pair) {
    return <OrderBookSkeleton />;
  }

  const maxCumulative = Math.max(
    Number(cumulativeBids[cumulativeBids.length - 1]?.[2] || 0),
    Number(cumulativeAsks[cumulativeAsks.length - 1]?.[2] || 0)
  );

  const renderRows = (data: (string | number)[][], type: 'bid' | 'ask') => {
    const color = type === 'bid' ? 'text-green-500' : 'text-red-500';
    const bgColor = type === 'bid' ? 'bg-green-500/10' : 'bg-red-500/10';

    return data.slice(0, 5).map(([price, amount, cumulative], i) => {
      const cumulativePercentage = (Number(cumulative) / maxCumulative) * 100;
      return (
        <div key={i} className="relative flex justify-between items-center h-6 text-xs p-1">
          <div className={cn("w-1/3 text-left font-mono", color)}>{Number(price).toFixed(2)}</div>
          <div className="w-1/3 text-right font-mono">{Number(amount).toFixed(4)}</div>
          <div className="w-1/3 text-right font-mono hidden md:block">{Number(cumulative).toFixed(4)}</div>
          <div className="absolute top-0 right-0 h-full -z-10" style={{ width: `${cumulativePercentage}%`, backgroundColor: bgColor }} />
        </div>
      );
    });
  };

  return (
    <Card className="h-full flex flex-col bg-card border-0">
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="sticky top-0 bg-card z-10 px-1 py-2 text-xs text-muted-foreground flex justify-between">
            <div className="w-1/3 text-left">Price ({quoteAsset})</div>
            <div className="w-1/3 text-right">Amount ({baseAsset})</div>
            <div className="w-1/3 text-right hidden md:block">Total ({baseAsset})</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {renderRows(cumulativeAsks.reverse(), 'ask')}
            <div className="h-10 flex items-center justify-center font-bold text-lg">
              {book?.lastPrice}
            </div>
            {renderRows(cumulativeBids, 'bid')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
