import { useTradeHistory } from '@/hooks/useTradeHistory';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { Order } from '../types';
import { useQuery } from '@tanstack/react-query';
import { getAllPairs } from '@/lib/api';

export function TradeHistory() {
  const { data: trades, isLoading, isError } = useTradeHistory();
  const isDesktop = useBreakpoint('md');

  const { data: pairs } = useQuery({ queryKey: ['all-pairs'], queryFn: getAllPairs });
  const pairMap = new Map(pairs?.map(p => [p.id, p]));

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading trade history...</div>;
  }

  if (isError) {
    return <div className="text-center py-8 text-destructive">Failed to load trade history.</div>;
  }

  const filledTrades = trades?.filter(t => t.status === 'filled');

  if (!filledTrades || filledTrades.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No trade history</div>;
  }

  return (
    <div className="overflow-auto">
      {isDesktop && (
        <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground mb-2 pb-2 border-b border-border">
          <div>Date</div>
          <div>Pair</div>
          <div>Type</div>
          <div className="text-right">Price</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Total</div>
        </div>
      )}
      {filledTrades.map((trade: Order) => {
        const symbol = pairMap.get(trade.tradingPairId)?.symbol;
        const total = Number(trade.price) * Number(trade.quantity);

        return (
        <div
          key={trade.id}
          className={`grid ${!isDesktop ? 'grid-cols-2' : 'grid-cols-6'} gap-1 md:gap-2 text-xs py-2 border-b border-border hover-elevate`}>
          {!isDesktop ? (
            <>
              <div>
                <div className="font-medium">{symbol}</div>
                <div className="text-muted-foreground">{new Date(trade.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className={`font-mono ${trade.side === 'buy' ? 'text-chart-2' : 'text-destructive'}`}>{trade.side.toUpperCase()}</div>
                <div className="font-mono">${trade.price}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span> {trade.quantity}
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">Total:</span> ${total.toFixed(2)}
              </div>
            </>
          ) : (
            <>
              <div className="text-muted-foreground md:table-cell">
                {new Date(trade.createdAt).toLocaleString()}
              </div>
              <div>{symbol}</div>
              <div
                className={trade.side === 'buy' ? 'text-chart-2' : 'text-destructive'}
              >
                {trade.side.toUpperCase()}
              </div>
              <div className="md:text-right font-mono">${trade.price}</div>
              <div className="md:text-right font-mono">{trade.quantity}</div>
              <div className="md:text-right font-mono">${total.toFixed(2)}</div>
            </>
          )}
        </div>
      )})}
    </div>
  );
}
