import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { getOrders } from '@/lib/api';
import type { Order } from '../types';
import { useBreakpoint } from '@/hooks/use-breakpoint';

export function OrderHistory() {
  const { user, authenticated } = usePrivy();
  const wallet = user?.wallet;
  const isDesktop = useBreakpoint('md');

  const { data: userOrders, isLoading, isError } = useQuery<Order[]>({
    queryKey: ['user-orders', wallet?.address, 'spot'],
    queryFn: async () => {
      if (!wallet?.address) return [];
      return getOrders(wallet.address);
    },
    enabled: authenticated && !!wallet?.address,
    refetchInterval: 3000,
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading order history...</div>;
  }

  if (isError) {
    return <div className="text-center py-8 text-destructive">Failed to load order history.</div>;
  }

  const historicalOrders = userOrders?.filter(order => order.status === 'filled' || order.status === 'canceled');

  if (!historicalOrders || historicalOrders.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No order history</div>;
  }

  return (
    <div className="overflow-auto">
      {isDesktop && (
        <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground mb-2 pb-2 border-b border-border">
          <div>Date</div>
          <div>Pair</div>
          <div>Type</div>
          <div className="text-right">Price</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Total</div>
          <div className="text-right">Status</div>
        </div>
      )}
      {historicalOrders.map((order) => (
        <div
          key={order.id}
          className={`grid ${!isDesktop ? 'grid-cols-2' : 'grid-cols-7'} gap-1 md:gap-2 text-xs py-2 border-b border-border hover-elevate`}>
          {!isDesktop ? (
            <>
              <div>
                <div className="font-medium">{order.symbol}</div>
                <div className="text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : ''}</div>
              </div>
              <div className="text-right">
                <div className={`font-mono ${order.side === 'buy' ? 'text-chart-2' : 'text-destructive'}`}>{order.side.toUpperCase()}</div>
                <div className="font-mono">${order.price}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span> {order.amount}
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">Total:</span> ${order.total}
              </div>
              <div className="col-span-2 text-right">
                <span className={`font-mono ${order.status === 'filled' ? 'text-green-500' : 'text-red-500'}`}>{order.status}</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-muted-foreground md:table-cell">
                {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : ''}
              </div>
              <div>{order.symbol}</div>
              <div
                className={order.side === 'buy' ? 'text-chart-2' : 'text-destructive'}
              >
                {order.side.toUpperCase()}
              </div>
              <div className="md:text-right font-mono">${order.price}</div>
              <div className="md:text-right font-mono">{order.amount}</div>
              <div className="md:text-right font-mono">${order.total}</div>
              <div className="md:text-right">
                <span className={`font-mono ${order.status === 'filled' ? 'text-green-500' : 'text-red-500'}`}>{order.status}</span>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
