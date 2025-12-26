
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderBook } from '@/components/OrderBook';
import { TradingChart } from '@/components/TradingChart';
import { TradePanel } from '@/components/TradePanel';
import { PriceChange } from '@/components/PriceChange';
import { useWallet } from '@/contexts/WalletContext';
import { getOrderBook, getOrders } from '@/lib/api';
import type { Order } from '@shared/schema';
import { useBreakpoint } from '@/hooks/use-breakpoint';

export default function Spot() {
  const [selectedPair] = useState('BTCUSDT');
  const { wallet } = useWallet();
  const isDesktop = useBreakpoint('md');

  const { data: orderBookData, isLoading: isOrderBookLoading, isError: isOrderBookError } = useQuery({
    queryKey: ['/api/order-book', selectedPair],
    queryFn: () => getOrderBook(selectedPair),
    refetchInterval: 3000,
  });

  const { data: orders, isLoading: areOrdersLoading, isError: areOrdersError } = useQuery<Order[]>({
    queryKey: ['/api/orders', wallet.address],
    queryFn: async () => {
      if (!wallet.address) return [];
      return getOrders(wallet.address);
    },
    enabled: wallet.isConnected && !!wallet.address,
  });

  const currentPrice = orderBookData?.bids?.[0]?.price || '0';

  const renderOpenOrders = () => (
    <TabsContent value={!isDesktop ? "orders" : "open"} className="flex-1 overflow-auto p-2 md:p-4 mt-0">
      {wallet.isConnected ? (
        <div className="overflow-auto">
          {isDesktop && (
            <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground mb-2 pb-2 border-b border-border">
              <div>Date</div>
              <div>Pair</div>
              <div>Type</div>
              <div className="text-right">Price</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Total</div>
              <div className="text-right">Action</div>
            </div>
          )}
          {areOrdersLoading && <div className="text-center py-8 text-muted-foreground">Loading open orders...</div>}
          {areOrdersError && <div className="text-center py-8 text-destructive">Failed to load open orders.</div>}
          {!areOrdersLoading && !areOrdersError && orders && orders.length > 0 ? (
            orders
              .filter((order) => order.status === 'open')
              .map((order) => (
                <div
                  key={order.id}
                  className={`grid ${!isDesktop ? 'grid-cols-2' : 'grid-cols-7'} gap-1 md:gap-2 text-xs py-2 border-b border-border hover-elevate`}
                  data-testid={`row-open-order-${order.id}`}
                >
                  {!isDesktop ? (
                    <>
                      <div>
                        <div className="font-medium">{order.symbol}</div>
                        <div className="text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString()}</div>
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
                        <button className="text-destructive hover:underline text-xs">
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-muted-foreground md:table-cell">
                        {new Date(order.createdAt).toLocaleTimeString()}
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
                        <button className="text-destructive hover:underline text-xs">
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
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
  );

  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* Price Header */}
      <div className="border-b border-border bg-card px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 md:gap-6">
          <div className="flex items-center gap-2 md:gap-6 flex-1 overflow-hidden">
            <div>
              <h1 className="text-lg md:text-2xl font-bold font-mono" data-testid="text-spot-symbol">
                {selectedPair}
              </h1>
              <div className="text-xs text-muted-foreground">Spot Trading</div>
            </div>
            <div>
              <div className="text-base md:text-lg font-bold font-mono text-chart-2" data-testid="text-spot-price">
                ${currentPrice}
              </div>
              <PriceChange value={2.34} />
            </div>
            <div className="hidden lg:grid grid-cols-3 gap-6 text-sm ml-auto">
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
      </div>

      {/* Trading Interface */}
      {!isDesktop ? (
        <Tabs defaultValue="chart" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-4 rounded-none border-b border-border">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="trade">Trade</TabsTrigger>
            <TabsTrigger value="book">Book</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>
          <TabsContent value="chart" className="flex-1 overflow-hidden">
            <TradingChart symbol={selectedPair} />
          </TabsContent>
          <TabsContent value="trade" className="overflow-auto">
            <TradePanel symbol={selectedPair} currentPrice={currentPrice} type="spot" />
          </TabsContent>
          <TabsContent value="book" className="overflow-hidden">
            {isOrderBookError ? (
                <div className="flex items-center justify-center h-full text-destructive">
                    Failed to load order book.
                </div>
            ) : (
                <OrderBook 
                  bids={orderBookData?.bids || []} 
                  asks={orderBookData?.asks || []}
                  isLoading={isOrderBookLoading}
                />
            )}
          </TabsContent>
          {renderOpenOrders()}
        </Tabs>
      ) : (
        <div className="flex-1 flex flex-col gap-2 p-2 overflow-hidden">
          {/* Main Trading Grid */}
          <div className="flex-1 grid grid-cols-12 gap-2 overflow-hidden">
            {/* Order Book - Left */}
            <div className="col-span-3 overflow-hidden">
              {isOrderBookError ? (
                  <div className="flex items-center justify-center h-full text-destructive">
                      Failed to load order book.
                  </div>
              ) : (
                  <OrderBook 
                    bids={orderBookData?.bids || []} 
                    asks={orderBookData?.asks || []}
                    isLoading={isOrderBookLoading}
                  />
              )}
            </div>

            {/* Chart and Trade Panel - Center/Right */}
            <div className="col-span-9 flex flex-col gap-2 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="grid grid-cols-3 flex-1 gap-2 overflow-hidden">
                        <div className="col-span-2 overflow-hidden">
                          <TradingChart symbol={selectedPair} />
                        </div>
                        <div className="overflow-hidden">
                          <TradePanel symbol={selectedPair} currentPrice={currentPrice} type="spot" />
                        </div>
                    </div>
                    {/* Bottom Section: Order History */}
                    <div className="h-80 flex-shrink-0 overflow-hidden mt-2">
                      <Card className="h-full flex flex-col">
                        <CardContent className="p-0 flex-1 overflow-hidden">
                          <Tabs defaultValue="open" className="h-full flex flex-col">
                            <TabsList className="w-full justify-start rounded-none border-b border-border px-2 md:px-4">
                              <TabsTrigger value="open" className="text-xs md:text-sm" data-testid="tab-open-orders">Open Orders</TabsTrigger>
                              <TabsTrigger value="history" className="text-xs md:text-sm" data-testid="tab-order-history">Order History</TabsTrigger>
                              <TabsTrigger value="trades" className="text-xs md:text-sm" data-testid="tab-trade-history">Trade History</TabsTrigger>
                            </TabsList>
                            {renderOpenOrders()}
                            <TabsContent value="history" className="flex-1 overflow-auto p-2 md:p-4 mt-0">
                              <div className="text-center py-8 text-muted-foreground">
                                No order history
                              </div>
                            </TabsContent>
                            <TabsContent value="trades" className="flex-1 overflow-auto p-2 md:p-4 mt-0">
                              <div className="text-center py-8 text-muted-foreground">No trade history</div>
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </Card>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
