
import { Skeleton } from '@/components/ui/skeleton';
import { Market, TradingPair } from '@/types';

interface OrderBookProps {
  pair?: TradingPair;
  book?: Market;
}

export function OrderBookSkeleton() {
  return (
    <div className="h-full p-2">
      {Array.from({ length: 15 }).map((_, i: number) => (
        <Skeleton key={i} className="h-6 w-full mb-1" />
      ))}
    </div>
  );
}

export function OrderBook({ pair, book }: OrderBookProps) {
  const bids = book?.bids || [];
  const asks = book?.asks || [];
  const baseAsset = pair?.baseToken.symbol;
  const quoteAsset = pair?.quoteToken.symbol;

  if (!pair) {
    return <OrderBookSkeleton />;
  }

  return (
    <div className="h-full flex flex-col bg-background p-2 text-xs">
      <div className="grid grid-cols-2 gap-2 text-muted-foreground mb-2">
        <div className="text-left">Price ({quoteAsset})</div>
        <div className="text-right">Quantity ({baseAsset})</div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Asks (Sell Orders) */}
        <div>
          {asks.slice(0, 7).reverse().map(([price, amount]: [string, string], i: number) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-2 py-1 relative"
              data-testid={`row-ask-${i}`}>
              <div className="font-mono text-red-500">{price}</div>
              <div className="font-mono text-right">{amount}</div>
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className="my-2 py-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl font-bold font-mono text-green-500" data-testid="text-spread-price">
              {bids[0]?.[0] || '0.00'}
            </span>
            <span className="text-sm text-muted-foreground">
              ≈${bids[0]?.[0] || '0.00'}
            </span>
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        <div>
          {bids.slice(0, 7).map(([price, amount]: [string, string], i: number) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-2 py-1 relative"
              data-testid={`row-bid-${i}`}>
              <div className="font-mono text-green-500">{price}</div>
              <div className="font-mono text-right">{amount}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-2">
            <span className="text-green-500">B 30%</span>
            <div className="w-full h-2 mx-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: '30%' }}></div>
            </div>
            <span className="text-red-500">70% S</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="p-1 border border-border rounded-md">...</div>
            <select className="p-1 border border-border rounded-md bg-transparent text-xs">
                <option>0.01</option>
                <option>0.1</option>
                <option>1</option>
            </select>
        </div>
      </div>
    </div>
  );
}
