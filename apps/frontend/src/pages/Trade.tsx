
import { useContext } from 'react';
import { OrderBook } from '@/components/OrderBook';
import { TradePanel, SkeletonTradePanel } from '@/components/TradePanel';
import { MarketDataContext } from '@/contexts/MarketDataContext';
import { TradingPairsContext } from '@/contexts/TradingPairsContext';
import { Skeleton } from '@/components/ui/skeleton';

interface TradeProps {
  symbol: string;
}

export default function Trade({ symbol }: TradeProps) {
  const { markets } = useContext(MarketDataContext)!;
  const { pairs } = useContext(TradingPairsContext)!;

  const pair = pairs.get(symbol);
  const market = markets.get(symbol);

  if (!pair) {
    return (
      <div className="grid grid-cols-2 gap-2 p-2 h-full bg-background">
        <div className="col-span-1">
          <SkeletonTradePanel />
        </div>
        <div className="col-span-1">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-2 h-full bg-background">
      <div className="col-span-1">
        <TradePanel pair={pair} market={market} />
      </div>
      <div className="col-span-1">
        <OrderBook pair={pair} book={market} />
      </div>
    </div>
  );
}
