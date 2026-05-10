
import { useNavigate } from 'react-router-dom';
import { TableCell, TableRow } from '@/components/ui/table';
import { PriceChange } from '@/components/PriceChange';
import { TradingPair, Market } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getDisplaySymbolBySymbol } from '@/utils/tokenDisplay';

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
    if (volume === null || volume === undefined) return <Skeleton className="h-5 w-16 ml-auto" />;
    const numValue = parseFloat(volume.toString());
    if (isNaN(numValue)) return <Skeleton className="h-5 w-16 ml-auto" />;

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
    if (value === null || value === undefined) return <Skeleton className="h-5 w-16 ml-auto" />;
    const numValue = parseFloat(value.toString());
    if (isNaN(numValue)) return <Skeleton className="h-5 w-16 ml-auto" />;
    return `${prefix}${numValue.toFixed(2)}`;
  };

  const priceChange24h = market?.priceChangePercent;

  return (
    <TableRow onClick={() => handleRowClick(pair.symbol)} className="cursor-pointer hover:bg-muted/50">
        <TableCell className="font-medium">
            <div className="flex items-center">
                <img src={pair.base.logo} alt={pair.base.name} className="w-6 h-6 rounded-full" />
                <img src={pair.quote.logo} alt={pair.quote.name} className="w-6 h-6 rounded-full -ml-2" />
                <span className="ml-2">{getDisplaySymbolBySymbol(pair.symbol)}</span>
            </div>
        </TableCell>
      <TableCell className="text-right font-mono md:table-cell">{renderValue(market?.lastPrice, '$')}</TableCell>
      <TableCell className="text-right">
        {priceChange24h !== undefined ? <PriceChange value={priceChange24h} /> : <Skeleton className="h-5 w-16 ml-auto" />}
      </TableCell>
      <TableCell className="text-right font-mono hidden md:table-cell">{renderValue(market?.high24h, '$')}</TableCell>
      <TableCell className="text-right font-mono hidden md:table-cell">{renderValue(market?.low24h, '$')}</TableCell>
      <TableCell className="text-right font-mono hidden md:table-cell">{formatVolume(market?.volume24h)}</TableCell>
    </TableRow>
  );
}
