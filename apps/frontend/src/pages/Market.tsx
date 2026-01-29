import { useQuery } from '@tanstack/react-query';
import { getTrendingPairs } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PriceChange } from '@/components/PriceChange';
import { useNavigate } from 'react-router-dom';
import { Market } from '@/types';

export default function MarketPage() {
  const navigate = useNavigate();
  const { data: trendingMarkets, isLoading, isError } = useQuery<Market[]>({
    queryKey: ['trending-pairs'],
    queryFn: getTrendingPairs,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const handleRowClick = (pair: string) => {
    navigate(`/spot?pair=${pair}`);
  };

  const renderValue = (value: string | number | null | undefined, prefix = '', suffix = '') => {
    if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>;
    const numValue = parseFloat(value.toString());
    if (isNaN(numValue)) return <span className="text-muted-foreground">-</span>;
    return `${prefix}${numValue.toFixed(2)}${suffix}`;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-2 p-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    if (isError) {
      return <div className="text-center py-8 text-destructive">Failed to load market data. Please try again later.</div>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pair</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">24h Change</TableHead>
            <TableHead className="text-right">24h High</TableHead>
            <TableHead className="text-right">24h Low</TableHead>
            <TableHead className="text-right">24h Volume</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trendingMarkets?.map((market) => (
            <TableRow key={market.symbol} onClick={() => handleRowClick(market.symbol)} className="cursor-pointer hover:bg-muted/50">
              <TableCell className="font-medium">{market.symbol}</TableCell>
              <TableCell className="text-right font-mono">{renderValue(market.lastPrice, '$')}</TableCell>
              <TableCell className="text-right">
                <PriceChange value={0} />
              </TableCell>
              <TableCell className="text-right font-mono">{renderValue(market.high24h, '$')}</TableCell>
              <TableCell className="text-right font-mono">{renderValue(market.low24h, '$')}</TableCell>
              <TableCell className="text-right font-mono">{renderValue(market.volume24h, '', 'M')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-foreground">Markets</h1>
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
