import { OrderBook } from '@/components/OrderBook';
import { FuturesTradePanel } from '@/components/FuturesTradePanel';

interface FuturesTradeProps {
  symbol: string;
  currentPrice: string;
}

export default function FuturesTrade({ symbol, currentPrice }: FuturesTradeProps) {
  return (
    <div className="grid grid-cols-2 gap-2 p-2 h-full bg-background">
      <div className="col-span-1">
        <FuturesTradePanel symbol={symbol} currentPrice={currentPrice} isMobile />
      </div>
      <div className="col-span-1">
        <OrderBook />
      </div>
    </div>
  );
}
