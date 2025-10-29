import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { OrderBook } from '@/components/OrderBook';
import { TradingChart } from '@/components/TradingChart';
import { TradePanel } from '@/components/TradePanel';
import { PriceChange } from '@/components/PriceChange';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { FiBarChart2, FiX } from 'react-icons/fi';
import type { Order } from '@shared/schema';

export default function Futures() {
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [showChart, setShowChart] = useState(false);
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

  const { data: positions } = useQuery<Order[]>({
    queryKey: ['/api/orders', 'futures', wallet.address],
    queryFn: async () => {
      if (!wallet.address) return [];
      const response = await fetch(`/api/orders/${wallet.address}?category=futures`);
      if (!response.ok) throw new Error('Failed to fetch positions');
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono" data-testid="text-futures-symbol">
                {selectedPair}
              </h1>
              <Badge variant="default" className="text-xs">Perpetual</Badge>
            </div>
            <div className="text-xs text-muted-foreground">Futures Trading</div>
          </div>
          <div>
            <div className="text-lg font-bold font-mono text-chart-2" data-testid="text-futures-price">
              $45,234.56
            </div>
            <PriceChange value={2.34} />
          </div>
          <div className="ml-auto grid grid-cols-4 gap-6 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Mark Price</div>
              <div className="font-mono font-medium">$45,230.00</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Funding Rate</div>
              <div className="font-mono font-medium text-chart-2">+0.0100%</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">24h Volume</div>
              <div className="font-mono font-medium">3.2B USDT</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Open Interest</div>
              <div className="font-mono font-medium">1.8B USDT</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowChart(!showChart)}
            className="ml-2"
            data-testid="button-toggle-chart-futures"
          >
            {showChart ? <FiX className="w-5 h-5" /> : <FiBarChart2 className="w-5 h-5" />}
          </Button>
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
        <div className={showChart ? "col-span-6 h-full overflow-hidden flex flex-col gap-2" : "col-span-9 h-full overflow-hidden flex flex-col gap-2"}>
          {showChart && (
            <div className="flex-1 min-h-0">
              <TradingChart symbol={selectedPair} />
            </div>
          )}

          {/* Positions and Orders */}
          <div className={showChart ? "h-64 flex-shrink-0" : "flex-1"}>
            <Card className="h-full flex flex-col">
              <CardContent className="p-0 flex-1 overflow-hidden">
                <Tabs defaultValue="positions" className="h-full flex flex-col">
                  <TabsList className="w-full justify-start rounded-none border-b border-border px-4">
                    <TabsTrigger value="positions" data-testid="tab-positions">Positions</TabsTrigger>
                    <TabsTrigger value="open" data-testid="tab-open-orders-futures">Open Orders</TabsTrigger>
                    <TabsTrigger value="history" data-testid="tab-order-history-futures">Order History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="positions" className="flex-1 overflow-auto p-4 mt-0">
                    {wallet.isConnected ? (
                      <div className="overflow-auto">
                        <div className="grid grid-cols-8 gap-2 text-xs text-muted-foreground mb-2 pb-2 border-b border-border">
                          <div>Symbol</div>
                          <div>Size</div>
                          <div className="text-right">Entry Price</div>
                          <div className="text-right">Mark Price</div>
                          <div className="text-right">Liq. Price</div>
                          <div className="text-right">Margin</div>
                          <div className="text-right">PnL</div>
                          <div className="text-right">Action</div>
                        </div>
                        {positions && positions.length > 0 ? (
                          positions.map((position) => (
                            <div
                              key={position.id}
                              className="grid grid-cols-8 gap-2 text-xs py-2 border-b border-border hover-elevate"
                              data-testid={`row-position-${position.id}`}
                            >
                              <div>
                                <div className="font-medium">{position.symbol}</div>
                                <Badge
                                  variant={position.side === 'buy' ? 'default' : 'destructive'}
                                  className="text-xs mt-1"
                                >
                                  {position.leverage}x {position.side.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="font-mono">{position.amount}</div>
                              <div className="text-right font-mono">${position.price}</div>
                              <div className="text-right font-mono">$45,234.56</div>
                              <div className="text-right font-mono text-destructive">
                                $40,123.45
                              </div>
                              <div className="text-right font-mono">${position.total}</div>
                              <div className="text-right">
                                <span className="text-chart-2 font-medium">+$234.56</span>
                                <div className="text-xs text-chart-2">+5.2%</div>
                              </div>
                              <div className="text-right">
                                <button className="text-destructive hover:underline text-xs">
                                  Close
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No open positions
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Connect wallet to view positions
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="open" className="flex-1 overflow-auto p-4 mt-0">
                    <div className="text-center py-8 text-muted-foreground">No open orders</div>
                  </TabsContent>

                  <TabsContent value="history" className="flex-1 overflow-auto p-4 mt-0">
                    <div className="text-center py-8 text-muted-foreground">
                      No order history
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trade Panel - Right */}
        <div className="col-span-3 h-full overflow-hidden">
          <TradePanel symbol={selectedPair} currentPrice="45234.56" type="futures" />
        </div>
      </div>
    </div>
  );
}
