import { useNavigate } from 'react-router-dom';
import { useMarketData } from '@/hooks/use-market-data';
import { TableCell, TableRow } from '@/components/ui/table';
import { PriceChange } from '@/components/PriceChange';
import { Skeleton } from '@/components/ui/skeleton';

type MarketRowProps = {
  pair: string;
};

export function MarketRow({ pair }: MarketRowProps) {
  const navigate = useNavigate();
  const { marketData, isLoading, isError } = useMarketData(pair);

  const handleRowClick = (pair: string) => {
    navigate(`/spot?pair=${pair}`);
  };

  const renderValue = (value: string | number | null | undefined, prefix = '', suffix = '') => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>;
    const numValue = parseFloat(value.toString());
    if (isNaN(numValue)) return <span className="text-muted-foreground">-</span>;
    return `${prefix}${numValue.toFixed(2)}${suffix}`;
  };

  if (isLoading) {
    return (
      <TableRow>
        <TableCell className="font-medium">{pair}</TableCell>
        <TableCell colSpan={5}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      </TableRow>
    );
  }

  if (isError || !marketData) {
    return (
        <TableRow onClick={() => handleRowClick(pair)} className="cursor-pointer hover:bg-muted/50">
            <TableCell className="font-medium">{pair}</TableCell>
            <TableCell className="text-right font-mono text-muted-foreground" colSpan={5}>
                Failed to load market data
            </TableCell>
        </TableRow>
    );
  }

  return (
    <TableRow onClick={() => handleRowClick(marketData.symbol)} className="cursor-pointer hover:bg-muted/50">
      <TableCell className="font-medium">{marketData.symbol}</TableCell>
      <TableCell className="text-right font-mono">{renderValue(marketData.lastPrice, '$')}</TableCell>
      <TableCell className="text-right">
        <PriceChange value={0} />
      </TableCell>
      <TableCell className="text-right font-mono">{renderValue(marketData.high24h, '$')}</TableCell>
      <TableCell className="text-right font-mono">{renderValue(marketData.low24h, '$')}</TableCell>
      <TableCell className="text-right font-mono">{renderValue(marketData.volume24h, '', 'M')}</TableCell>
    </TableRow>
  );
}
