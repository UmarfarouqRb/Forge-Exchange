
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TableCell, TableRow } from '@/components/ui/table';
import { PriceChange } from '@/components/PriceChange';
import { Skeleton } from '@/components/ui/skeleton';
import { TradingPair } from '@/types';
import { getMarket } from '@/lib/api';
import { subscribe, unsubscribe } from '@/lib/ws/market';
import { getMarketState, setMarketState } from '@/lib/state/marketState';

type MarketRowProps = {
  pair: TradingPair;
};

export function MarketRow({ pair }: MarketRowProps) {
  const navigate = useNavigate();
  const [market, setMarket] = useState(getMarketState(pair.id));

  useEffect(() => {
    getMarket(pair.id).then(setMarketState).then(() => setMarket(getMarketState(pair.id)));

    const cb = (data: any) => {
      setMarketState(data)
      setMarket(getMarketState(pair.id))
    }

    subscribe(pair.id, cb)

    return () => {
      unsubscribe(pair.id)
    }

  }, [pair.id])


  const handleRowClick = (pair: TradingPair) => {
    navigate(`/spot/${pair.id}`);
  };

  const renderValue = (value: string | number | null | undefined, prefix = '', suffix = '') => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>;
    const numValue = parseFloat(value.toString());
    if (isNaN(numValue)) return <span className="text-muted-foreground">-</span>;
    return `${prefix}${numValue.toFixed(2)}${suffix}`;
  };

  if (!market) {
    return (
      <TableRow>
        <TableCell className="font-medium">{pair.symbol}</TableCell>
        <TableCell colSpan={5}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow onClick={() => handleRowClick(pair)} className="cursor-pointer hover:bg-muted/50">
      <TableCell className="font-medium">{pair.symbol}</TableCell>
      <TableCell className="text-right font-mono">{renderValue(market.lastPrice, '$')}</TableCell>
      <TableCell className="text-right">
        <PriceChange value={0} />
      </TableCell>
      <TableCell className="text-right font-mono">{renderValue(market.high24h, '$')}</TableCell>
      <TableCell className="text-right font-mono">{renderValue(market.low24h, '$')}</TableCell>
      <TableCell className="text-right font-mono">{renderValue(market.volume24h, '', 'M')}</TableCell>
    </TableRow>
  );
}
