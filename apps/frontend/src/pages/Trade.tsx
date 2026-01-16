import { OrderBook } from '@/components/OrderBook';
import { TradePanel } from '@/components/TradePanel';

interface TradeProps {
  symbol: string;
  currentPrice: string;
  isMobile?: boolean;
}

export default function Trade({ symbol, currentPrice, isMobile }: TradeProps) {
  return (
    <div className="grid grid-cols-2 gap-2 p-2 h-full bg-background">
      <div className="col-span-1">
        <TradePanel symbol={symbol} currentPrice={currentPrice} isMobile={isMobile} />
      </div>
      <div className="col-span-1">
        <OrderBook />
      </div>
    </div>
  );
}
