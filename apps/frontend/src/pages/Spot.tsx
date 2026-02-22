import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TradingChart } from '@/components/TradingChart';
import { PriceChange } from '@/components/PriceChange';
import { getAllPairs, getMarketBySymbol } from '@/lib/api';
import type { Market, TradingPair } from '@/types/market-data';
import { NewAssetSelector } from "@/components/NewAssetSelector";
import Trade from './Trade';
import { subscribe, unsubscribe } from '@/lib/ws/market';
import { Skeleton } from '@/components/ui/skeleton';

function TradeHeader({ 
    market, 
    selectedTradingPair, 
    pairsList, 
    setSelectedTradingPair 
}: { 
    market?: Market, 
    selectedTradingPair?: TradingPair, 
    pairsList: TradingPair[], 
    setSelectedTradingPair: (pair: TradingPair) => void 
}) {
  const currentPrice = market?.currentPrice ? `$${parseFloat(market.currentPrice).toFixed(2)}` : '-';
  const priceChange24h = market?.priceChangePercent;
  const high = market?.high24h ? `$${parseFloat(market.high24h).toFixed(2)}` : '-';
  const low = market?.low24h ? `$${parseFloat(market.low24h).toFixed(2)}` : '-';
  const volume = market?.volume24h ? `${(parseFloat(market.volume24h) / 1e9).toFixed(2)}B` : '-';
  const quoteAsset = selectedTradingPair?.quoteToken;

  return (
    <div className="border-b border-border bg-card px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
      <div className="flex items-center justify-between gap-2 md:gap-6">
        <div className="flex items-center gap-2 md:gap-6 flex-1 overflow-hidden">
          <div>
            <NewAssetSelector 
                pairsList={pairsList} 
                selectedTradingPair={selectedTradingPair} 
                setSelectedTradingPair={setSelectedTradingPair} 
            />
            <div className="text-xs text-muted-foreground">Spot Trading</div>
          </div>
          <div>
            <div
              className={`text-base md:text-lg font-bold font-mono ${priceChange24h !== undefined && priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}
              data-testid="text-spot-price"
            >
              {currentPrice}
            </div>
            {priceChange24h !== undefined ? <PriceChange value={priceChange24h} /> : <Skeleton className="h-5 w-16" />}
          </div>
          <div className="hidden lg:grid grid-cols-3 gap-6 text-sm ml-auto">
            <div>
              <div className="text-muted-foreground text-xs">24h High</div>
              <div className="font-mono font-medium">{high}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">24h Low</div>
              <div className="font-mono font-medium">{low}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">24h Volume</div>
              <div className="font-mono font-medium">{volume} {quoteAsset?.symbol}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Spot() {
  const [pairsList, setPairsList] = useState<TradingPair[]>([]);
  const [selectedTradingPair, setSelectedTradingPair] = useState<TradingPair | undefined>();
  const [market, setMarket] = useState<Market | undefined>();
  const [isErrorPairs, setIsErrorPairs] = useState<boolean>(false);

  useEffect(() => {
    const fetchTradingPairs = async () => {
      setIsErrorPairs(false);
      try {
        const data = await getAllPairs();
        setPairsList(data);
        if (data.length > 0) {
          const defaultPair = data.find((p: TradingPair) => p.symbol === 'BTCUSDC') || data[0];
          setSelectedTradingPair(defaultPair);
        }
      } catch (error) {
        console.error("Failed to fetch trading pairs:", error);
        setIsErrorPairs(true);
      }
    };
    fetchTradingPairs();
  }, []);

  useEffect(() => {
    if (!selectedTradingPair) return;

    const topic = `prices:${selectedTradingPair.symbol}`;
    const handleUpdate = (update: { price: number }) => {
        setMarket(prevMarket => {
            if (prevMarket) {
                return { ...prevMarket, currentPrice: String(update.price) };
            }
            return undefined; // Let the fetchMarket handle the initial state
        });
    };
    
    const fetchMarket = async () => {
        try {
            const data = await getMarketBySymbol(selectedTradingPair.symbol);
            setMarket(data);
        } catch (error) {
            console.error("Failed to fetch market data:", error);
            setMarket(undefined);
        }
    };

    fetchMarket();

    subscribe(topic, handleUpdate);

    return () => {
      unsubscribe(topic);
    };
  }, [selectedTradingPair]);

  if (isErrorPairs) {
    return <div className="h-[calc(100vh-4rem)] flex items-center justify-center text-lg text-red-500">Error loading trading pairs. Please try again later.</div>;
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col text-xs">
      <TradeHeader 
        market={market} 
        selectedTradingPair={selectedTradingPair} 
        pairsList={pairsList} 
        setSelectedTradingPair={setSelectedTradingPair} 
      />
      <Tabs defaultValue="chart" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="trade">Trade</TabsTrigger>
        </TabsList>
        <TabsContent value="chart" className="flex-1 overflow-hidden">
          {selectedTradingPair ? (
            <TradingChart symbol={selectedTradingPair.symbol} />
          ) : (
            <div className="flex items-center justify-center h-full text-lg">Select a market to view the chart.</div>
          )}
        </TabsContent>
        <TabsContent value="trade" className="flex-1 overflow-auto p-2 flex flex-col h-full">
          {selectedTradingPair ? (
            <Trade pair={selectedTradingPair} market={market} pairsList={pairsList} />
          ) : (
            <div className="flex items-center justify-center h-full text-lg">Select a market to trade.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}