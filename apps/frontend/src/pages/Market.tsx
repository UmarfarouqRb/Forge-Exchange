import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceChange } from '@/components/PriceChange';
import { MiniChart } from '@/components/MiniChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { FiSearch, FiStar } from 'react-icons/fi';
import type { TradingPair } from '../types';

export default function Market() {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'spot' | 'futures'>('all');

  const { data: pairs, isLoading, error } = useQuery<TradingPair[]>({
    queryKey: ['/api/trading-pairs', category],
    queryFn: async () => {
      const url = category === 'all' 
        ? '/api/trading-pairs'
        : `/api/trading-pairs?category=${category}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch trading pairs');
      return response.json();
    },
  });

  const generateMockChartData = () => {
    return Array.from({ length: 20 }, () => Math.random() * 100 + 50);
  };

  const filteredPairs = pairs?.filter((pair) =>
    pair.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold mb-6 text-foreground">Markets</h1>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <Tabs value={category} onValueChange={(v) => setCategory(v as 'all' | 'spot' | 'futures')}>
                <TabsList>
                  <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                  <TabsTrigger value="spot" data-testid="tab-spot">Spot</TabsTrigger>
                  <TabsTrigger value="futures" data-testid="tab-futures">Futures</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative w-full md:w-80">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search trading pairs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-pairs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trading Pairs Table */}
        <Card>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-border text-xs font-medium text-muted-foreground">
              <div className="col-span-1"></div>
              <div className="col-span-2">Pair</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">24h Change</div>
              <div className="col-span-2 text-right">24h Volume</div>
              <div className="col-span-3">Chart</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border">
              {error ? (
                <div className="p-12 text-center">
                  <div className="max-w-md mx-auto">
                    <p className="text-destructive font-medium mb-2">Failed to load trading pairs</p>
                    <p className="text-sm text-muted-foreground mb-4">{(error as Error).message}</p>
                    <Button
                      onClick={() => window.location.reload()}
                      variant="outline"
                      size="sm"
                      data-testid="button-retry-pairs"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-12 gap-4 p-4 items-center">
                    <div className="col-span-1">
                      <Skeleton className="h-4 w-4" />
                    </div>
                    <div className="col-span-2">
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <div className="col-span-2">
                      <Skeleton className="h-5 w-24 ml-auto" />
                    </div>
                    <div className="col-span-2">
                      <Skeleton className="h-5 w-16 ml-auto" />
                    </div>
                    <div className="col-span-2">
                      <Skeleton className="h-5 w-20 ml-auto" />
                    </div>
                    <div className="col-span-3">
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                ))
              ) : filteredPairs && filteredPairs.length > 0 ? (
                filteredPairs.map((pair) => (
                  <Link key={pair.id} href={`/spot?pair=${pair.symbol}`}>
                    <div
                      className="grid grid-cols-12 gap-4 p-4 items-center hover-elevate cursor-pointer"
                      data-testid={`row-market-${pair.symbol}`}
                    >
                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          data-testid={`button-favorite-${pair.symbol}`}
                        >
                          <FiStar
                            className={`w-4 h-4 ${pair.isFavorite ? 'fill-primary text-primary' : ''}`}
                          />
                        </Button>
                      </div>
                      <div className="col-span-2">
                        <div className="font-medium text-foreground">{pair.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {pair.baseAsset}/{pair.quoteAsset}
                        </div>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="font-mono font-medium text-foreground" data-testid={`text-price-${pair.symbol}`}>
                          ${parseFloat(pair.currentPrice).toLocaleString()}
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <PriceChange value={parseFloat(pair.priceChange24h)} />
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="font-mono text-sm text-foreground">
                          ${parseFloat(pair.volume24h).toLocaleString()}
                        </div>
                      </div>
                      <div className="col-span-3">
                        <MiniChart
                          data={generateMockChartData()}
                          isPositive={parseFloat(pair.priceChange24h) >= 0}
                        />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  No trading pairs found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
