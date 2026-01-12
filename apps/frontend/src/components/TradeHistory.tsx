import { useTradeHistory } from '@/hooks/useTradeHistory';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import type { Trade } from '../types';

export function TradeHistory() {
  const { data: trades, isLoading, isError } = useTradeHistory();
  const isDesktop = useBreakpoint('md');

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading trade history...</div>;
  }

  if (isError) {
    return <div className="text-center py-8 text-destructive">Failed to load trade history.</div>;
  }

  if (!trades || trades.length === 0) {
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
      {trades.map((trade: Trade) => (
        <div
          key={trade.id}
          className={`grid ${!isDesktop ? 'grid-cols-2' : 'grid-cols-6'} gap-1 md:gap-2 text-xs py-2 border-b border-border hover-elevate`}>
          {!isDesktop ? (
            <>
              <div>
                <div className="font-medium">{trade.symbol}</div>
                <div className="text-muted-foreground">{new Date(trade.createdAt).toLocaleTimeString()}</div>
              </div>
              <div className="text-right">
                <div className={`font-mono ${trade.side === 'buy' ? 'text-chart-2' : 'text-destructive'}`}>{trade.side.toUpperCase()}</div>
                <div className="font-mono">${trade.price}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span> {trade.amount}
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">Total:</span> ${trade.total}
              </div>
            </>
          ) : (
            <>
              <div className="text-muted-foreground md:table-cell">
                {new Date(trade.createdAt).toLocaleTimeString()}
              </div>
              <div>{trade.symbol}</div>
              <div
                className={trade.side === 'buy' ? 'text-chart-2' : 'text-destructive'}
              >
                {trade.side.toUpperCase()}
              </div>
              <div className="md:text-right font-mono">${trade.price}</div>
              <div className="md:text-right font-mono">{trade.amount}</div>
              <div className="md:text-right font-mono">${trade.total}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
