
import { useContext, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TradingChart } from '@/components/TradingChart';
import { PriceChange } from '@/components/PriceChange';
import { usePrivy } from '@privy-io/react-auth';
import { getOrders } from '@/lib/api';
import type { Order, Market, TradingPair } from '@/types/market-data';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { NewAssetSelector } from "@/components/NewAssetSelector";
import { TradeHistory } from '@/components/TradeHistory';
import { OrderHistory } from '@/components/OrderHistory';
import Trade from './Trade';
import { MarketDataContext } from '@/contexts/MarketDataContext';
import { Skeleton } from '@/components/ui/skeleton';

function TradeHeader({ pair, market }: { pair?: TradingPair; market?: Market }) {
  const navigate = useNavigate();
  const { pairs } = useContext(MarketDataContext)!;
  const pairsArray = Array.from(pairs.values());

  const handleAssetChange = (symbol: string) => {
    navigate(`/spot/${symbol}`);
  };

  if (!pair || !market) {
    return (
      <div className="border-b border-border bg-card px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 md:gap-6">
          <div className="flex items-center gap-2 md:gap-6 flex-1 overflow-hidden">
            <div>
              <NewAssetSelector 
                asset={pair?.symbol || ''}
                setAsset={handleAssetChange} 
                assets={pairsArray} 
              />
              <div className="text-xs text-muted-foreground">Spot Trading</div>
            </div>
            <div className='flex flex-col gap-1'>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-12" />
            </div>
            <div className="hidden lg:grid grid-cols-3 gap-6 text-sm ml-auto">
                <div className='flex flex-col gap-1'><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-20" /></div>
                <div className='flex flex-col gap-1'><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-20" /></div>
                <div className='flex flex-col gap-1'><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-20" /></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentPrice = market.lastPrice || '0';
  const priceChange24h = market.priceChangePercent || 0;
  const high = market.high24h || '0';
  const low = market.low24h || '0';
  const volume = market.volume24h || '0';
  const quoteAsset = pair.quoteToken;

  return (
    <div className="border-b border-border bg-card px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
      <div className="flex items-center justify-between gap-2 md:gap-6">
        <div className="flex items-center gap-2 md:gap-6 flex-1 overflow-hidden">
          <div>
            <NewAssetSelector 
              asset={pair.symbol}
              setAsset={handleAssetChange} 
              assets={pairsArray} 
            />
            <div className="text-xs text-muted-foreground">Spot Trading</div>
          </div>
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
              <div className="font-mono font-medium">{!isNaN(parseFloat(volume)) ? `${(parseFloat(volume) / 1e9).toFixed(2)}B` : '0.00B'} {quoteAsset?.symbol}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Spot() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { pairs, markets } = useContext(MarketDataContext)!;

  useEffect(() => {
    if (!symbol && pairs.size > 0) {
      const firstPairSymbol = Array.from(pairs.keys())[0];
      if (firstPairSymbol) {
        navigate(`/spot/${firstPairSymbol}`, { replace: true });
      }
    }
  }, [symbol, pairs, navigate]);

  const pair = symbol ? pairs.get(symbol) : undefined;
  const market = symbol ? markets.get(symbol) : undefined;

  const { user, authenticated } = usePrivy();
  const wallet = user?.wallet;
  const isDesktop = useBreakpoint('lg');

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

  const renderOpenOrders = () => {
    const openOrders = userOrders?.filter((order: Order) => order.status === 'open');
    const tradingPairsMap: Map<string, TradingPair> = new Map(Array.from(pairs.values()).map((p: TradingPair) => [p.id, p]));

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
    <Card className="h-full flex flex-col">
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

  if (pairs.size === 0) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-background flex flex-col">
        <TradeHeader />
        <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden">
            <div className="col-span-8 flex flex-col gap-2 overflow-hidden">
                <Skeleton className='h-full w-full' />
            </div>
            <div className="col-span-4 overflow-hidden">
                <Skeleton className="h-full w-full" />
            </div>
        </div>
      </div>
    );
  }

  if (!isDesktop) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-background flex flex-col">
        <TradeHeader pair={pair} market={market} />
        <Tabs defaultValue="chart" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-border">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="trade">Trade</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>
          <TabsContent value="chart" className="flex-1 overflow-hidden">
            {!pair ? <Skeleton className='h-full w-full' /> : <TradingChart symbol={pair.symbol} />}
          </TabsContent>
          <TabsContent value="trade" className="flex-1 overflow-auto p-2">
            {!symbol ? <Skeleton className="h-full w-full" /> : <Trade symbol={symbol} />}
          </TabsContent>
          <TabsContent value="orders" className="flex-1 overflow-auto p-2">
            {renderOrderTabs()}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col">
      <TradeHeader pair={pair} market={market} />
      <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden">
        <div className="col-span-8 flex flex-col gap-2 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {!pair ? <Skeleton className='h-full w-full' /> : <TradingChart symbol={pair.symbol} />}
          </div>
          <div className="h-60 flex-shrink-0 overflow-hidden mt-2">
            {renderOrderTabs()}
          </div>
        </div>
        <div className="col-span-4 overflow-hidden">
          {!symbol ? <Skeleton className="h-full w-full" /> : <Trade symbol={symbol} />}
        </div>
      </div>
    </div>
  );
}
