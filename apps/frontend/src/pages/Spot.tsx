
import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TradingChart } from '@/components/TradingChart';
import { PriceChange } from '@/components/PriceChange';
import { getAllPairs, getMarketBySymbol } from '@/lib/api';
import type { Market, Token, TradingPair } from '@/types/market-data';
import { NewAssetSelector } from "@/components/NewAssetSelector";
import Trade from './Trade';
import { subscribe, unsubscribe } from '@/lib/ws/market';
import { Skeleton } from '@/components/ui/skeleton';

const normalizeTokenForDisplay = (token: Token): Token => {
  if (token && token.symbol === 'WETH') {
    return { ...token, symbol: 'ETH' };
  }
  return token;
};

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
  const quoteAsset = selectedTradingPair?.quote;

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
              <div className="font-mono font-medium">{volume} {quoteAsset ? quoteAsset.symbol : ''}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Spot() {
  const [pairsList, setPairsList] = useState<TradingPair[]>([]);
  const [selectedPair, setSelectedPair] = useState<TradingPair | undefined>();
  const [market, setMarket] = useState<Market | undefined>();
  const [isErrorPairs, setIsErrorPairs] = useState<boolean>(false);

  useEffect(() => {
    const fetchTradingPairs = async () => {
      setIsErrorPairs(false);
      try {
        const pairs = await getAllPairs();
        setPairsList(pairs);

        if (pairs.length > 0) {
          const defaultPair = pairs.find((p: TradingPair) => p.symbol === 'ETHUSDC') || pairs[0];
          setSelectedPair(defaultPair);
        }
      } catch (error) {
        console.error("Failed to fetch trading pairs:", error);
        setIsErrorPairs(true);
      }
    };
    fetchTradingPairs();
  }, []);

  useEffect(() => {
    if (!selectedPair) return;

    const topic = `prices:${selectedPair.symbol}`;
    const handleUpdate = (update: { price: number }) => {
        setMarket(prevMarket => prevMarket ? { ...prevMarket, currentPrice: String(update.price) } : undefined);
    };
    
    const fetchMarket = async () => {
        try {
            const data = await getMarketBySymbol(selectedPair.symbol);
            setMarket(data);
        } catch (error) {
            console.error("Failed to fetch market data:", error);
            setMarket(undefined);
        }
    };

    fetchMarket();
    subscribe(topic, handleUpdate);

    return () => unsubscribe(topic);
  }, [selectedPair]);

  if (isErrorPairs) {
    return <div className="h-[calc(100vh-4rem)] flex items-center justify-center text-lg text-red-500">Error loading trading pairs. Please try again later.</div>;
  }

  const displayPairsList = useMemo(() => {
    return pairsList.map(p => ({
        ...p,
        base: normalizeTokenForDisplay(p.base),
        quote: normalizeTokenForDisplay(p.quote),
    }))
  }, [pairsList]);

  const selectedDisplayPair = useMemo(() => {
    if (!selectedPair) return undefined;
    return {
        ...selectedPair,
        base: normalizeTokenForDisplay(selectedPair.base),
        quote: normalizeTokenForDisplay(selectedPair.quote),
    }
  }, [selectedPair]);


  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col text-xs">
      <TradeHeader 
        market={market} 
        selectedTradingPair={selectedDisplayPair} 
        pairsList={displayPairsList} 
        setSelectedTradingPair={setSelectedPair} 
      />
      <Tabs defaultValue="chart" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="trade">Trade</TabsTrigger>
        </TabsList>
        <TabsContent value="chart" className="flex-1 overflow-hidden">
          {selectedDisplayPair ? (
            <TradingChart symbol={selectedDisplayPair.symbol} />
          ) : (
            <div className="flex items-center justify-center h-full">Select a market to view the chart.</div>
          )}
        </TabsContent>
        <TabsContent value="trade" className="flex-1 overflow-auto p-2 flex flex-col h-full">
          {selectedDisplayPair ? (
            <Trade pair={selectedDisplayPair} market={market} pairsList={displayPairsList} />
          ) : (
            <div className="flex items-center justify-center h-full">Select a market to trade.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
