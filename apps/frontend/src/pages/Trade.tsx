import { OrderBook } from '@/components/OrderBook';
import { TradePanel } from '@/components/TradePanel';
import { TradingPair, Market } from '@/types/market-data';
import { AgentLog } from '@/components/AgentLog';
import { useAgentStatus } from '@/hooks/useAgentStatus';

interface TradeProps {
  pair: TradingPair;
  market: Market | undefined;
}

export default function Trade({ pair, market }: TradeProps) {
  const { logs, clearLogs } = useAgentStatus();

  if (!pair) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col h-full bg-background text-xs p-2 gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-1 min-h-0">
          <TradePanel pair={pair} market={market} />
        </div>
        <div className="col-span-1 min-h-0">
          <OrderBook pair={pair} book={market} />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <AgentLog logs={logs} clearLogs={clearLogs} />
      </div>
    </div>
  );
}
