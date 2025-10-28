import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderBook } from '@/components/OrderBook';
import { TradingChart } from '@/components/TradingChart';
import { TradePanel } from '@/components/TradePanel';
import { PriceChange } from '@/components/PriceChange';
import { useWallet } from '@/contexts/WalletContext';
import type { Order } from '@shared/schema';

export default function Spot() {
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const { wallet } = useWallet();

  // Fetch order book data from backend
  const { data: orderBookData } = useQuery({
    queryKey: ['/api/order-book', selectedPair],
    queryFn: async () => {
      const response = await fetch(`/api/order-book/${selectedPair}`);
      if (!response.ok) throw new Error('Failed to fetch order book');
      return response.json();
    },
    refetchInterval: 3000, // Refresh every 3 seconds for simulated real-time updates
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ['/api/orders', wallet.address],
    queryFn: async () => {
      if (!wallet.address) return [];
      const response = await fetch(`/api/orders/${wallet.address}?category=spot`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    enabled: wallet.isConnected && !!wallet.address,
  });

  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* Price Header */}
      <div className="border-b border-border bg-card px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold font-mono" data-testid="text-spot-symbol">
              {selectedPair}
            </h1>
            <div className="text-xs text-muted-foreground">Spot Trading</div>
          </div>
          <div>
            <div className="text-lg font-bold font-mono text-chart-2" data-testid="text-spot-price">
              $45,234.56
            </div>
            <PriceChange value={2.34} />
          </div>
          <div className="ml-auto grid grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">24h High</div>
              <div className="font-mono font-medium">$46,500.00</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">24h Low</div>
              <div className="font-mono font-medium">$44,100.00</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">24h Volume</div>
              <div className="font-mono font-medium">2.4B USDT</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Interface */}
      <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden">
        {/* Order Book - Left */}
        <div className="col-span-3 h-full overflow-hidden">
          <OrderBook 
            bids={orderBookData?.bids || []} 
            asks={orderBookData?.asks || []}
            isLoading={!orderBookData}
          />
        </div>

        {/* Chart - Center */}
        <div className="col-span-6 h-full overflow-hidden flex flex-col gap-2">
          <div className="flex-1 min-h-0">
            <TradingChart symbol={selectedPair} />
          </div>

          {/* Order History / Open Orders */}
          <div className="h-64 flex-shrink-0">
            <Card className="h-full flex flex-col">
              <CardContent className="p-0 flex-1 overflow-hidden">
                <Tabs defaultValue="open" className="h-full flex flex-col">
                  <TabsList className="w-full justify-start rounded-none border-b border-border px-4">
                    <TabsTrigger value="open" data-testid="tab-open-orders">Open Orders</TabsTrigger>
                    <TabsTrigger value="history" data-testid="tab-order-history">Order History</TabsTrigger>
                    <TabsTrigger value="trades" data-testid="tab-trade-history">Trade History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="open" className="flex-1 overflow-auto p-4 mt-0">
                    {wallet.isConnected ? (
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
                        {orders && orders.length > 0 ? (
                          orders
                            .filter((order) => order.status === 'pending')
                            .map((order) => (
                              <div
                                key={order.id}
                                className="grid grid-cols-7 gap-2 text-xs py-2 border-b border-border hover-elevate"
                                data-testid={`row-open-order-${order.id}`}
                              >
                                <div className="text-muted-foreground">
                                  {new Date(order.createdAt).toLocaleTimeString()}
                                </div>
                                <div>{order.symbol}</div>
                                <div
                                  className={
                                    order.side === 'buy' ? 'text-chart-2' : 'text-destructive'
                                  }
                                >
                                  {order.side.toUpperCase()}
                                </div>
                                <div className="text-right font-mono">${order.price}</div>
                                <div className="text-right font-mono">{order.amount}</div>
                                <div className="text-right font-mono">${order.total}</div>
                                <div className="text-right">
                                  <button className="text-destructive hover:underline text-xs">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No open orders
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Connect wallet to view orders
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="flex-1 overflow-auto p-4 mt-0">
                    <div className="text-center py-8 text-muted-foreground">
                      No order history
                    </div>
                  </TabsContent>

                  <TabsContent value="trades" className="flex-1 overflow-auto p-4 mt-0">
                    <div className="text-center py-8 text-muted-foreground">No trade history</div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trade Panel - Right */}
        <div className="col-span-3 h-full overflow-hidden">
          <TradePanel symbol={selectedPair} currentPrice="45234.56" type="spot" />
        </div>
      </div>
    </div>
  );
}
