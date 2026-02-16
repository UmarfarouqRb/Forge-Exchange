import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TradingChart } from '@/components/TradingChart';
import { PriceChange } from '@/components/PriceChange';
import { usePrivy } from '@privy-io/react-auth';
import type { Order, TradingPair } from '../types/market-data';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import FuturesTrade from './FuturesTrade';
import { FuturesTradePanel } from '@/components/FuturesTradePanel';

export default function Futures() {
  const [selectedPair] = useState('BTCUSDT');
  const { user, authenticated } = usePrivy();
  const wallet = user?.wallet;
  const isDesktop = useBreakpoint('md');

  const { data: tradingPair } = useQuery<TradingPair>({
    queryKey: ['/api/trading-pairs', selectedPair, 'futures'],
    queryFn: async () => {
      const response = await fetch(`/api/trading-pairs/${selectedPair}?category=futures`);
      if (!response.ok) throw new Error('Failed to fetch trading pair');
      return response.json();
    },
    refetchInterval: 3000,
  });

  const { data: positions, isLoading: arePositionsLoading, isError: arePositionsError } = useQuery<Order[]>({
    queryKey: ['/api/orders', 'futures', wallet?.address],
    queryFn: async () => {
      if (!wallet?.address) return [];
      const response = await fetch(`/api/orders/${wallet.address}?category=futures`);
      if (!response.ok) throw new Error('Failed to fetch positions');
      return response.json();
    },
    enabled: authenticated && !!wallet?.address,
    initialData: [],
  });

  const currentPrice = tradingPair?.currentPrice || '0';
  const priceChange = tradingPair?.priceChange24h || '0';
  const volume = tradingPair?.volume24h || '0';

  const renderPositions = () => (
    <TabsContent value={!isDesktop ? "positions" : "positions"} className="flex-1 overflow-auto p-2 md:p-4 mt-0">
      {authenticated ? (
        <div className="overflow-auto">
          {isDesktop && (
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
          )}
          {arePositionsLoading && <div className="text-center py-8 text-muted-foreground">Loading positions...</div>}
          {arePositionsError && <div className="text-center py-8 text-destructive">Failed to load positions.</div>}
          {!arePositionsLoading && !arePositionsError && positions && positions.length > 0 ? (
            positions
              .filter((position) => position.status === 'open')
              .map((position) => (
              <div
                key={position.id}
                className={`grid ${!isDesktop ? 'grid-cols-2' : 'grid-cols-8'} gap-1 md:gap-2 text-xs py-2 border-b border-border hover-elevate`}
                data-testid={`row-position-${position.id}`}
              >
                {!isDesktop ? (
                    <>
                        <div>
                            <div className="font-medium">{position.symbol}</div>
                            <Badge
                            variant={position.side === 'buy' ? 'default' : 'destructive'}
                            className="text-xs mt-1"
                            >
                            {position.leverage}x {position.side.toUpperCase()}
                            </Badge>
                        </div>
                        <div className="text-right">
                            <div className="font-mono">{position.amount}</div>
                            <div className="font-mono text-muted-foreground">${position.price}</div>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Liq. Price:</span>
                            <span className="font-mono text-destructive"> $40,123.45</span>
                        </div>
                        <div className="text-right">
                            <span className="text-muted-foreground">Margin:</span> ${position.total}
                        </div>
                        <div className="col-span-2 text-right">
                            <span className="text-chart-2 font-medium">+$234.56</span>
                            <div className="text-xs text-chart-2">+5.2%</div>
                        </div>
                        <div className="col-span-2 text-right">
                            <button className="text-destructive hover:underline text-xs">
                                Close
                            </button>
                        </div>
                    </>
                ) : (
                    <>
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
                        <div className="md:text-right font-mono">${position.price}</div>
                        <div className="md:text-right font-mono">${currentPrice}</div>
                        <div className="md:text-right font-mono text-destructive">
                            $40,123.45
                        </div>
                        <div className="md:text-right font-mono">${position.total}</div>
                        <div className="md:text-right">
                            <span className="text-chart-2 font-medium">+$234.56</span>
                            <div className="text-xs text-chart-2">+5.2%</div>
                        </div>
                        <div className="md:text-right">
                            <button className="text-destructive hover:underline text-xs">
                            Close
                            </button>
                        </div>
                    </>
                )}
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
  );

  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* Price Header */}
      <div className="border-b border-border bg-card px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 md:gap-6">
          <div className="flex items-center gap-2 md:gap-6 flex-1 overflow-hidden">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-2xl font-bold font-mono" data-testid="text-futures-symbol">
                  {selectedPair}
                </h1>
                <Badge variant="default" className="text-xs">Perpetual</Badge>
              </div>
              <div className="text-xs text-muted-foreground">Futures Trading</div>
            </div>
            <div>
              <div 
                className={`text-base md:text-lg font-bold font-mono ${parseFloat(priceChange) >= 0 ? 'text-chart-2' : 'text-chart-1'}`}
                data-testid="text-futures-price"
              >
                ${currentPrice}
              </div>
              <PriceChange value={parseFloat(priceChange)} />
            </div>
            <div className="hidden xl:grid grid-cols-4 gap-6 text-sm ml-auto">
              <div>
                <div className="text-muted-foreground text-xs">Mark Price</div>
                <div className="font-mono font-medium">${currentPrice}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Funding Rate</div>
                <div className="font-mono font-medium text-chart-2">+0.0100%</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">24h Volume</div>
                <div className="font-mono font-medium">{(parseFloat(volume) / 1e9).toFixed(2)}B USDT</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Open Interest</div>
                <div className="font-mono font-medium">1.8B USDT</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Interface */}
      {!isDesktop ? (
        <Tabs defaultValue="chart" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-3 rounded-none border-b border-border">
                <TabsTrigger value="chart">Chart</TabsTrigger>
                <TabsTrigger value="trade">Trade</TabsTrigger>
                <TabsTrigger value="positions">Positions</TabsTrigger>
            </TabsList>
            <TabsContent value="chart" className="flex-1 overflow-hidden">
                <TradingChart symbol={selectedPair} />
            </TabsContent>
            <TabsContent value="trade" className="overflow-auto">
                <FuturesTrade symbol={selectedPair} currentPrice={currentPrice} />
            </TabsContent>
            {renderPositions()}
        </Tabs>
        ) : (
        <div className="flex-1 flex flex-col gap-2 p-2 overflow-hidden">
            <div className="flex-1 grid grid-cols-12 gap-2 overflow-hidden">
                <div className="col-span-8 flex flex-col gap-2 overflow-hidden">
                    <div className="grid grid-cols-1 flex-1 gap-2 overflow-hidden">
                        <div className="col-span-1 overflow-hidden">
                            <TradingChart symbol={selectedPair} />
                        </div>
                    </div>
                    <div className="h-80 flex-shrink-0 overflow-hidden mt-2">
                    <Card className="h-full flex flex-col">
                        <CardContent className="p-0 flex-1 overflow-hidden">
                        <Tabs defaultValue="positions" className="h-full flex flex-col">
                            <TabsList className="w-full justify-start rounded-none border-b border-border px-2 md:px-4">
                            <TabsTrigger value="positions" className="text-xs md:text-sm" data-testid="tab-positions">Positions</TabsTrigger>
                            <TabsTrigger value="open" className="text-xs md:text-sm" data-testid="tab-open-orders-futures">Open Orders</TabsTrigger>
                            <TabsTrigger value="history" className="text-xs md:text-sm" data-testid="tab-order-history-futures">Order History</TabsTrigger>
                            </TabsList>
                            {renderPositions()}
                            <TabsContent value="open" className="flex-1 overflow-auto p-2 md:p-4 mt-0">
                                <div className="text-center py-8 text-muted-foreground">No open orders</div>
                            </TabsContent>
                            <TabsContent value="history" className="flex-1 overflow-auto p-2 md:p-4 mt-0">
                                <div className="text-center py-8 text-muted-foreground">No order history</div>
                            </TabsContent>
                        </Tabs>
                        </CardContent>
                    </Card>
                    </div>
                </div>
                <div className="col-span-4 overflow-hidden">
                    <FuturesTradePanel symbol={selectedPair} currentPrice={currentPrice} />
                </div>
            </div>
        </div>
        )}
    </div>
  );
}
