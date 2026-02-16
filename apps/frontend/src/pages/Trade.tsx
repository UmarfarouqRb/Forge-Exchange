
import { OrderBook } from '@/components/OrderBook';
import { TradePanel } from '@/components/TradePanel';
import { TradingPair, Market, Order } from '@/types/market-data';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { getOrders } from '@/lib/api';
import { usePrivy } from '@privy-io/react-auth';
import { useMemo } from 'react';
import { OrderHistory } from '@/components/OrderHistory';
import { TradeHistory } from '@/components/TradeHistory';

interface TradeProps {
  pair: TradingPair;
  market: Market | undefined;
  pairsList: TradingPair[];
}

export default function Trade({ pair, market, pairsList }: TradeProps) {
  const { user, authenticated } = usePrivy();
  const wallet = user?.wallet;

  const { data: userOrders, isLoading: areUserOrdersLoading, isError: areUserOrdersError } = useQuery<Order[]>({
    queryKey: ['user-orders', wallet?.address, 'spot'],
    queryFn: async (): Promise<Order[]> => {
      if (!wallet?.address) return [];
      return getOrders(wallet.address);
    },
    enabled: authenticated && !!wallet?.address,
    refetchInterval: 10000,
    initialData: [],
  });

  const tradingPairsMap = useMemo(() => {
    const map = new Map<string, TradingPair>();
    pairsList.forEach((p: TradingPair) => map.set(p.id, p));
    return map;
  }, [pairsList]);

  const renderOpenOrders = () => {
    const openOrders = userOrders?.filter((order: Order) => order.status === 'open');

    return (
        <TabsContent value="open-orders" className="flex-1 overflow-auto p-2 md:p-4 mt-0">
            {authenticated ? (
                <div className="overflow-auto">
                    <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground mb-2 pb-2 border-b border-border">
                        <div>Date</div>
                        <div>Pair</div>
                        <div>Type</div>
                        <div className="text-right">Price</div>
                        <div className="text-right">Amount</div>
                        <div className="text-right">Total</div>
                        <div className="text-right">Action</div>
                    </div>
                    {areUserOrdersLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading open orders...</div>
                    ) : areUserOrdersError ? (
                        <div className="text-center py-8 text-destructive">Failed to load open orders.</div>
                    ) : openOrders && openOrders.length > 0 ? (
                        openOrders.map((order: Order) => (
                          <div key={order.id} className="grid grid-cols-7 gap-2 text-xs py-2 border-b border-border hover-elevate">
                            <div className="text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : ''}</div>
                            <div>{tradingPairsMap.get(order.tradingPairId)?.symbol}</div>
                            <div className={order.side === 'buy' ? 'text-chart-2' : 'text-destructive'}>{order.side.toUpperCase()}</div>
                            <div className="text-right font-mono">${order.price}</div>
                            <div className="text-right font-mono">{order.quantity}</div>
                            <div className="text-right font-mono">${(parseFloat(order.price) * parseFloat(order.quantity)).toFixed(2)}</div>
                            <div className="text-right"><button className="text-destructive hover:underline text-xs">Cancel</button></div>
                          </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">No open orders</div>
                    )}
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">Connect wallet to view orders</div>
            )}
        </TabsContent>
    );
  };

  const renderOrderTabs = () => (
    <Card className="h-full flex flex-col mt-2">
      <CardContent className="p-0 flex-1 overflow-hidden">
        <Tabs defaultValue="open-orders" className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b border-border px-4">
            <TabsTrigger value="open-orders">Open Orders</TabsTrigger>
            <TabsTrigger value="history">Order History</TabsTrigger>
            <TabsTrigger value="trades">Trade History</TabsTrigger>
          </TabsList>
          {renderOpenOrders()}
          <TabsContent value="history" className="flex-1 overflow-auto p-4 mt-0">
            <OrderHistory />
          </TabsContent>
          <TabsContent value="trades" className="flex-1 overflow-auto p-4 mt-0">
            <TradeHistory />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  if (!pair) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col h-full bg-background text-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 flex-1">
        <div className="col-span-1">
          <TradePanel pair={pair} market={market} />
        </div>
        <div className="col-span-1">
          <OrderBook pair={pair} book={market} />
        </div>
      </div>
      <div className="flex-1">
        {renderOrderTabs()}
      </div>
    </div>
  );
}
