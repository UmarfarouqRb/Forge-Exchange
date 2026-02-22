
import { useNavigate } from 'react-router-dom';
import { TableCell, TableRow } from '@/components/ui/table';
import { PriceChange } from '@/components/PriceChange';
import { TradingPair, Market } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

type MarketRowProps = {
  pair: TradingPair;
  market: Market | undefined;
};

export function MarketRow({ pair, market }: MarketRowProps) {
  const navigate = useNavigate();

  const handleRowClick = (symbol: string) => {
    navigate(`/spot/${symbol}`);
  };

  const formatVolume = (volume: string | number | null | undefined) => {
    if (volume === null || volume === undefined) return <Skeleton className="h-6 w-full" />;
    const numValue = parseFloat(volume.toString());
    if (isNaN(numValue)) return <Skeleton className="h-6 w-full" />;

    if (numValue >= 1_000_000_000) {
      return `${(numValue / 1_000_000_000).toFixed(2)}B`;
    }
    if (numValue >= 1_000_000) {
      return `${(numValue / 1_000_000).toFixed(2)}M`;
    }
    if (numValue >= 1_000) {
      return `${(numValue / 1_000).toFixed(2)}K`;
    }
    return numValue.toFixed(2);
  };
  
  const renderValue = (value: string | number | null | undefined, prefix = '') => {
    if (value === null || value === undefined) return <Skeleton className="h-6 w-full" />;
    const numValue = parseFloat(value.toString());
    if (isNaN(numValue)) return <Skeleton className="h-6 w-full" />;
    return `${prefix}${numValue.toFixed(2)}`;
  };

  const priceChange24h = market?.priceChangePercent;

  return (
    <TableRow onClick={() => handleRowClick(pair.symbol)} className="cursor-pointer hover:bg-muted/50">
      <TableCell className="font-medium">{pair.symbol}</TableCell>
      <TableCell className="text-right font-mono">{renderValue(market?.lastPrice, '$')}</TableCell>
      <TableCell className="text-right">
        {priceChange24h !== undefined ? <PriceChange value={priceChange24h} /> : <Skeleton className="h-6 w-16" />}
      </TableCell>
      <TableCell className="text-right font-mono">{renderValue(market?.high24h, '$')}</TableCell>
      <TableCell className="text-right font-mono">{renderValue(market?.low24h, '$')}</TableCell>
      <TableCell className="text-right font-mono">{formatVolume(market?.volume24h)}</TableCell>
    </TableRow>
  );
}
