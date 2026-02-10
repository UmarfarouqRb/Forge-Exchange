
import { useContext } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MarketRow } from '@/components/MarketRow';
import { MarketDataContext } from '@/contexts/MarketDataContext';

export default function MarketPage() {
  const { pairs, markets } = useContext(MarketDataContext)!;

  const renderContent = () => {
    if (pairs.size === 0) {
      return (
        <div className="space-y-2 p-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
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
          {Array.from(pairs.values()).map((pair) => (
            <MarketRow key={pair.symbol} pair={pair} market={markets.get(pair.symbol)} />
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
