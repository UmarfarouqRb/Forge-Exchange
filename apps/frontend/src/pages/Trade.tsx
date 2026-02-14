
import { OrderBook } from '@/components/OrderBook';
import { TradePanel } from '@/components/TradePanel';
import { TradingPair, Market } from '@/types/market-data';

interface TradeProps {
  pair: TradingPair;
  market: Market | undefined;
}

export default function Trade({ pair, market }: TradeProps) {

  if (!pair) {
    return <div>Loading...</div>
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
