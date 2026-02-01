import { OrderBook } from '@/components/OrderBook';
import { TradePanel } from '@/components/TradePanel';
import { Market } from '@/types';

interface TradeProps {
  symbol: string;
  currentPrice: string;
  isMobile?: boolean;
  orderBookData: Market | null;
  isOrderBookLoading: boolean;
  isOrderBookError: boolean;
  baseAsset: string;
  quoteAsset: string;
}

export default function Trade({ 
  symbol, 
  currentPrice, 
  isMobile, 
  orderBookData,
  isOrderBookLoading,
  isOrderBookError,
  baseAsset,
  quoteAsset
}: TradeProps) {
  return (
    <div className="grid grid-cols-2 gap-2 p-2 h-full bg-background">
      <div className="col-span-1">
        <TradePanel symbol={symbol} currentPrice={currentPrice} isMobile={isMobile} />
      </div>
      <div className="col-span-1">
        <OrderBook data={orderBookData} isLoading={isOrderBookLoading} isError={isOrderBookError} baseAsset={baseAsset} quoteAsset={quoteAsset} />
      </div>
    </div>
  );
}
