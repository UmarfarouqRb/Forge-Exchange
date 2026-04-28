import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { getAllPairs, getOrders } from '@/lib/api';
import type { Order } from '../types';
import { useBreakpoint } from '@/hooks/use-breakpoint';

export function Orders() {
  const { user, authenticated, getAccessToken } = usePrivy();
  const wallet = user?.wallet;
  const isDesktop = useBreakpoint('md');

  const { data: userOrders, isLoading, isError } = useQuery<Order[]>({
    queryKey: ['user-orders', wallet?.address, 'spot'],
    queryFn: async () => {
      if (!wallet?.address) return [];
      const accessToken = await getAccessToken();
      if (!accessToken) return [];
      return getOrders(wallet.address, accessToken);
    },
    enabled: authenticated && !!wallet?.address,
    refetchInterval: 3000,
  });

  const { data: pairs } = useQuery({ queryKey: ['all-pairs'], queryFn: getAllPairs });
  const pairMap = new Map(pairs?.map(p => [p.id, p]));

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading open orders...</div>;
  }

  if (isError) {
    return <div className="text-center py-8 text-destructive">Failed to load open orders.</div>;
  }

  const openOrders = userOrders?.filter(order => order.status === 'open' || order.status === 'pending' || order.status === 'processing' || order.status === 'matching');

  if (!openOrders || openOrders.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No open orders</div>;
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
      {openOrders.map((order) => {
        const symbol = pairMap.get(order.tradingPairId)?.symbol;
        const total = Number(order.price) * Number(order.quantity);

        return (
        <div
          key={order.id}
          className={`grid ${!isDesktop ? 'grid-cols-2' : 'grid-cols-7'} gap-1 md:gap-2 text-xs py-2 border-b border-border hover-elevate`}>
          {!isDesktop ? (
            <>
              <div>
                <div className="font-medium">{symbol}</div>
                <div className="text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</div>
              </div>
              <div className="text-right">
                <div className={`font-mono ${order.side === 'buy' ? 'text-chart-2' : 'text-destructive'}`}>{order.side.toUpperCase()}</div>
                <div className="font-mono">${order.price}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span> {order.quantity}
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">Total:</span> ${total.toFixed(2)}
              </div>
              <div className="col-span-2 text-right">
                <span className={`font-mono`}>{order.status}</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-muted-foreground md:table-cell">
                {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
              </div>
              <div>{symbol}</div>
              <div
                className={order.side === 'buy' ? 'text-chart-2' : 'text-destructive'}
              >
                {order.side.toUpperCase()}
              </div>
              <div className="md:text-right font-mono">${order.price}</div>
              <div className="md:text-right font-mono">{order.quantity}</div>
              <div className="md:text-right font-mono">${total.toFixed(2)}</div>
              <div className="md:text-right">
                <span className={`font-mono`}>{order.status}</span>
              </div>
            </>
          )}
        </div>
      )})}
    </div>
  );
}
