import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface OrderBookEntry {
  price: string;
  amount: string;
  total: string;
  symbol: string;
}

interface OrderBookProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  isLoading?: boolean;
}

export function OrderBook({ bids, asks, isLoading }: OrderBookProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Order Book</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-sm">Order Book</CardTitle>
        <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mt-2">
          <div>Price (USDT)</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Total</div>
          <div className="text-right">Symbol</div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 overflow-auto">
        {/* Asks (Sell Orders) */}
        <div className="mb-2">
          {asks.slice(0, 12).reverse().map((ask, i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-2 text-xs py-1 relative hover-elevate rounded"
              data-testid={`row-ask-${i}`}
            >
              <div
                className="absolute inset-y-0 right-0 bg-destructive/10"
                style={{ width: `${(parseFloat(ask.total) / 100000) * 100}%` }}
              />
              <div className="font-mono text-destructive relative z-10">{ask.price}</div>
              <div className="font-mono text-right relative z-10">{ask.amount}</div>
              <div className="font-mono text-right relative z-10">{ask.total}</div>
              <div className="font-mono text-right relative z-10">{ask.symbol}</div>
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className="my-3 py-2 border-y border-border">
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg font-bold font-mono text-chart-2" data-testid="text-spread-price">
              {asks[0]?.price || '0.00'}
            </span>
            <span className="text-xs text-muted-foreground">
              ↑ ${(parseFloat(asks[0]?.price || '0') - parseFloat(bids[0]?.price || '0')).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        <div>
          {bids.slice(0, 12).map((bid, i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-2 text-xs py-1 relative hover-elevate rounded"
              data-testid={`row-bid-${i}`}
            >
              <div
                className="absolute inset-y-0 right-0 bg-chart-2/10"
                style={{ width: `${(parseFloat(bid.total) / 100000) * 100}%` }}
              />
              <div className="font-mono text-chart-2 relative z-10">{bid.price}</div>
              <div className="font-mono text-right relative z-10">{bid.amount}</div>
              <div className="font-mono text-right relative z-10">{bid.total}</div>
              <div className="font-mono text-right relative z-10">{bid.symbol}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
