
import { useQuery } from '@tanstack/react-query';
import { getAllPairs } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MarketRow } from '@/components/MarketRow';
import { TradingPair } from '@/types';

export default function MarketPage() {
  const { data: tradingPairs, isLoading, isError } = useQuery<TradingPair[]>({
    queryKey: ['trading-pairs'],
    queryFn: getAllPairs,
    refetchInterval: 60000, // Refetch every 60 seconds
  });

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
      return <div className="text-center py-8 text-destructive">Failed to load trading pairs. Please try again later.</div>;
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
          {tradingPairs?.map((pair) => (
            <MarketRow key={pair.id} pair={pair} />
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
