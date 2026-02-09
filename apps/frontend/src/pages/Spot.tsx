
import { useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TradingChart } from '@/components/TradingChart';
import { PriceChange } from '@/components/PriceChange';
import { usePrivy } from '@privy-io/react-auth';
import { getOrders } from '@/lib/api';
import type { Order, Market, TradingPair, Token } from '@/types/market-data';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { NewAssetSelector } from "@/components/NewAssetSelector";
import { TradeHistory } from '@/components/TradeHistory';
import { OrderHistory } from '@/components/OrderHistory';
import Trade from './Trade';
import { MarketDataContext } from '@/contexts/MarketDataContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function Spot() {
  const { tradingPairId } = useParams<{ tradingPairId: string }>();
  const navigate = useNavigate();
  const { pairs, markets, isLoading: arePairsLoading, isError: arePairsError } = useContext(MarketDataContext)!;

  const tradingPair: TradingPair | undefined = pairs.find((p: TradingPair) => p.id === tradingPairId);
  const tradingPairsMap: Map<string, TradingPair> = new Map(pairs.map((p: TradingPair) => [p.id, p]));

  const { user, authenticated } = usePrivy();
  const wallet = user?.wallet;
  const isDesktop = useBreakpoint('md');

  const market = tradingPairId ? markets.get(tradingPairId) : null;

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
  
  const isNotFound = !arePairsLoading && !!tradingPairId && !tradingPair;

  const orderBookData: Market | null = market ? { ...market } : null;
  const currentPrice = market?.lastPrice || '0';
  const priceChange24h = 0;
  const high = market?.high24h || '0';
  const low = market?.low24h || '0';
  const volume = market?.volume24h || '0';

  const baseAsset: Token | undefined = tradingPair?.baseToken;
  const quoteAsset: Token | undefined = tradingPair?.quoteToken;

  const renderOpenOrders = () => {
    const openOrders = userOrders?.filter((order: Order) => order.status === 'open');

    return (
        <TabsContent value={!isDesktop ? "orders" : "open"} className="flex-1 overflow-auto p-2 md:p-4 mt-0">
            {authenticated ? (
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
                    {areUserOrdersLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading open orders...</div>
                    ) : areUserOrdersError ? (
                        <div className="text-center py-8 text-destructive">Failed to load open orders.</div>
                    ) : openOrders && openOrders.length > 0 ? (
                        openOrders.map((order: Order) => (
                          <div
                            key={order.id}
                            className={`grid ${!isDesktop ? 'grid-cols-2' : 'grid-cols-7'} gap-1 md:gap-2 text-xs py-2 border-b border-border hover-elevate`}
                            data-testid={`row-open-order-${order.id}`}
                          >
                            {!isDesktop ? (
                              <>
                                <div>
                                  <div className="font-medium">{tradingPairsMap.get(order.tradingPairId)?.symbol}</div>
                                  <div className="text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : ''}</div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-mono ${order.side === 'buy' ? 'text-chart-2' : 'text-destructive'}`}>{order.side.toUpperCase()}</div>
                                  <div className="font-mono">${order.price}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Amount:</span> {order.quantity}
                                </div>
                                <div className="text-right">
                                  <span className="text-muted-foreground">Total:</span> ${(parseFloat(order.price) * parseFloat(order.quantity)).toFixed(2)}
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
                                  {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : ''}
                                </div>
                                <div>{tradingPairsMap.get(order.tradingPairId)?.symbol}</div>
                                <div
                                  className={order.side === 'buy' ? 'text-chart-2' : 'text-destructive'}
                                >
                                  {order.side.toUpperCase()}
                                </div>
                                <div className="md:text-right font-mono">${order.price}</div>
                                <div className="md:text-right font-mono">{order.quantity}</div>
                                <div className="md:text-right font-mono">${(parseFloat(order.price) * parseFloat(order.quantity)).toFixed(2)}</div>
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
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* Price Header */}
      <div className="border-b border-border bg-card px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 md:gap-6">
          <div className="flex items-center gap-2 md:gap-6 flex-1 overflow-hidden">
            <div>
              <NewAssetSelector 
                asset={tradingPairId || ''}
                setAsset={(id) => navigate(`/spot/${id}`)} 
                assets={pairs} 
                isLoading={arePairsLoading} 
                isError={arePairsError} 
              />
              <div className="text-xs text-muted-foreground">Spot Trading</div>
            </div>
            {arePairsLoading ? (
                <>
                    <div className='flex flex-col gap-1'>
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                    <div className="hidden lg:grid grid-cols-3 gap-6 text-sm ml-auto">
                        <div className='flex flex-col gap-1'><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-20" /></div>
                        <div className='flex flex-col gap-1'><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-20" /></div>
                        <div className='flex flex-col gap-1'><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-20" /></div>
                    </div>
                </>
            ) : isNotFound ? (
              <div className="flex items-center justify-center w-full text-muted-foreground">
                Trading pair not found
              </div>
            ) : (
                <>
                    <div>
                      <div
                        className={`text-base md:text-lg font-bold font-mono ${priceChange24h >= 0 ? 'text-chart-2' : 'text-chart-1'}`}
                        data-testid="text-spot-price"
                      >
                        ${currentPrice}
                      </div>
                      <PriceChange value={priceChange24h} />
                    </div>
                    <div className="hidden lg:grid grid-cols-3 gap-6 text-sm ml-auto">
                      <div>
                        <div className="text-muted-foreground text-xs">24h High</div>
                        <div className="font-mono font-medium">${high}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">24h Low</div>
                        <div className="font-mono font-medium">${low}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">24h Volume</div>
                        <div className="font-mono font-medium">{(parseFloat(volume) / 1e9).toFixed(2)}B {quoteAsset?.symbol}</div>
                      </div>
                    </div>
                </>
            )}
          </div>
        </div>
      </div>

      {/* Trading Interface */}
      { isNotFound && !arePairsLoading ? (
        <div className="flex-1 flex items-center justify-center text-center">
            <div>
                <h2 className="text-2xl font-bold">Trading Pair Not Found</h2>
                <p className="text-muted-foreground">Please select a valid pair from the asset selector above.</p>
            </div>
        </div>
      ) : (
        !isDesktop ? (
          <Tabs defaultValue="chart" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-3 rounded-none border-b border-border">
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="trade">Trade</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
            </TabsList>
            <TabsContent value="chart" className="flex-1 overflow-hidden">
              {arePairsLoading || !tradingPair ? <Skeleton className='h-full w-full' /> : <TradingChart symbol={tradingPair.symbol} />}
            </TabsContent>
            <TabsContent value="trade" className="overflow-auto">
              {arePairsLoading || !tradingPair ? (
                <div className="p-4"><Skeleton className="h-[400px] w-full" /></div>
              ) : (
                <Trade
                  tradingPair={tradingPair}
                  currentPrice={currentPrice}
                  isMobile={!isDesktop}
                  orderBookData={orderBookData}
                  isOrderBookLoading={arePairsLoading || !market}
                  isOrderBookError={false}
                  baseAsset={baseAsset?.symbol || ''}
                  quoteAsset={quoteAsset?.symbol || ''}
                />
              )}
            </TabsContent>
            {renderOpenOrders()}
          </Tabs>
        ) : (
          <div className="flex-1 flex flex-col gap-2 p-2 overflow-hidden">
            {/* Main Trading Grid */}
            <div className="flex-1 grid grid-cols-12 gap-2 overflow-hidden">
              {/* Chart and Trade Panel - Center/Right */}
              <div className="col-span-8 flex flex-col gap-2 overflow-hidden">
                  <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="grid grid-cols-1 flex-1 gap-2 overflow-hidden">
                          <div className="col-span-1 overflow-hidden">
                            {arePairsLoading || !tradingPair ? <Skeleton className='h-full w-full' /> : <TradingChart symbol={tradingPair.symbol} />}
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
                                <OrderHistory />
                              </TabsContent>
                              <TabsContent value="trades" className="flex-1 overflow-auto p-2 md:p-4 mt-0">
                                <TradeHistory />
                              </TabsContent>
                            </Tabs>
                          </CardContent>
                        </Card>
                      </div>
                  </div>
              </div>

              {/* Order Book and Trade Panel - Right */}
              <div className="col-span-4 overflow-hidden">
                {arePairsLoading || !tradingPair ? (
                    <Skeleton className="h-full w-full" />
                ) : (
                    <Trade
                        tradingPair={tradingPair}
                        currentPrice={currentPrice}
                        isMobile={!isDesktop}
                        orderBookData={orderBookData}
                        isOrderBookLoading={arePairsLoading || !market}
                        isOrderBookError={false}
                        baseAsset={baseAsset?.symbol || ''}
                        quoteAsset={quoteAsset?.symbol || ''}
                    />
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
