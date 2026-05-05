import { Skeleton } from '@/components/ui/skeleton';
import { Market, TradingPair } from '@/types/market-data';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
        {Array.from({ length: 5 }).map((_, i: number) => (
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
        <TableRow key={i} className="relative h-6 text-xs p-0">
          <TableCell className={cn("font-mono p-1 text-left pr-8", color)}>{Number(price).toFixed(2)}</TableCell>
          <TableCell className="font-mono p-1 text-right pl-8">{Number(amount).toFixed(4)}</TableCell>
          <TableCell className="font-mono p-1 text-right hidden md:table-cell">{Number(cumulative).toFixed(4)}</TableCell>
          <td className="absolute top-0 right-0 h-full -z-10" style={{ width: `${cumulativePercentage}%`, backgroundColor: bgColor }} />
        </TableRow>
      );
    });
  };

  return (
    <Card className="h-full flex flex-col bg-card border-0">
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <Table className="w-full table-fixed">
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="text-xs">
                <TableHead className="p-1 text-left w-1/3">Price ({quoteAsset})</TableHead>
                <TableHead className="p-1 text-right w-1/3">Amount ({baseAsset})</TableHead>
                <TableHead className="p-1 text-right hidden md:table-cell w-1/3">Total ({baseAsset})</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
          <div className="flex-1 overflow-y-auto">
            <Table className="w-full table-fixed">
              <TableBody>
                {renderRows(cumulativeAsks.reverse(), 'ask')}
                <TableRow className="h-10">
                  <TableCell colSpan={3} className="text-center font-bold text-lg">
                    {book?.lastPrice}
                  </TableCell>
                </TableRow>
                {renderRows(cumulativeBids, 'bid')}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
