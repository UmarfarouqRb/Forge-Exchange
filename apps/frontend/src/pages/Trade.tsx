
import { useContext } from 'react';
import { OrderBook } from '@/components/OrderBook';
import { TradePanel } from '@/components/TradePanel';
import { MarketDataContext } from '@/contexts/MarketDataContext';
import { TradingPairsContext } from '@/contexts/TradingPairsContext';
import { TradingPair } from '@/types';

interface TradeProps {
  symbol: string;
}

export default function Trade({ symbol }: TradeProps) {
  const { markets } = useContext(MarketDataContext)!;
  const { pairs } = useContext(TradingPairsContext)!;

  const pair = pairs.get(symbol);
  const market = markets.get(symbol);

  if (!pair) {
    return <div>Loading...</div>
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-2 h-full bg-background">
      <div className="col-span-1">
        <TradePanel pair={pair as TradingPair} market={market} />
      </div>
      <div className="col-span-1">
        <OrderBook pair={pair as TradingPair} book={market} />
      </div>
    </div>
  );
}
