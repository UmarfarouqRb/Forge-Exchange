import { useQuery } from '@tanstack/react-query';
import { getTrendingPairs } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PriceChange } from '@/components/PriceChange';
import { useNavigate } from 'react-router-dom';

export default function Market() {
  const navigate = useNavigate();
  const { data: trendingPairs, isLoading, isError } = useQuery<any[]>({
    queryKey: ['trending-pairs'],
    queryFn: getTrendingPairs,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const handleRowClick = (pair: string) => {
    navigate(`/spot?pair=${pair}`);
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
          {trendingPairs?.map((pair) => (
            <TableRow key={pair.symbol} onClick={() => handleRowClick(pair.symbol)} className="cursor-pointer hover:bg-muted/50">
              <TableCell className="font-medium">{pair.symbol}</TableCell>
              <TableCell className="text-right font-mono">${parseFloat(pair.lastPrice).toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <PriceChange value={parseFloat(pair.priceChangePercent)} />
              </TableCell>
              <TableCell className="text-right font-mono">${parseFloat(pair.high24h).toFixed(2)}</TableCell>
              <TableCell className="text-right font-mono">${parseFloat(pair.low24h).toFixed(2)}</TableCell>
              <TableCell className="text-right font-mono">{(parseFloat(pair.volume24h) / 1e6).toFixed(2)}M</TableCell>
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
