import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PriceChange } from '@/components/PriceChange';
import { MiniChart } from '@/components/MiniChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { FiArrowRight, FiTrendingUp, FiActivity } from 'react-icons/fi';
import type { TradingPair } from '@shared/schema';

export default function Home() {
  const { data: trendingPairs, isLoading } = useQuery<TradingPair[]>({
    queryKey: ['/api/trading-pairs/trending'],
  });

  const { data: topGainers } = useQuery<TradingPair[]>({
    queryKey: ['/api/trading-pairs/top-gainers'],
  });

  const { data: topLosers } = useQuery<TradingPair[]>({
    queryKey: ['/api/trading-pairs/top-losers'],
  });

  const generateMockChartData = () => {
    return Array.from({ length: 20 }, () => Math.random() * 100 + 50);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              Trade Crypto Without KYC
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Connect your wallet and start trading instantly on our decentralized exchange.
              Professional trading tools, no registration required.
            </p>
            <div className="flex gap-4">
              <Link href="/spot">
                <a>
                  <Button variant="default" size="lg" data-testid="button-start-trading">
                    Start Trading
                    <FiArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </a>
              </Link>
              <Link href="/market">
                <a>
                  <Button variant="outline" size="lg" data-testid="button-view-markets">
                    View Markets
                  </Button>
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Market Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                24h Trading Volume
              </CardTitle>
              <FiActivity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="text-volume-24h">
                $2.4B
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across all pairs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Traders
              </CardTitle>
              <FiTrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="text-active-traders">
                124,567
              </div>
              <p className="text-xs text-chart-2 mt-1">+12.5% from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Trading Pairs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="text-trading-pairs">
                250+
              </div>
              <p className="text-xs text-muted-foreground mt-1">Spot & Futures</p>
            </CardContent>
          </Card>
        </div>

        {/* Trending Pairs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Trending Markets</h2>
            <Link href="/market">
              <a>
                <Button variant="ghost" size="sm" data-testid="link-view-all-markets">
                  View All
                  <FiArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-8 w-32 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingPairs?.map((pair) => (
                <Link key={pair.id} href={`/spot?pair=${pair.symbol}`}>
                  <a>
                    <Card className="hover-elevate cursor-pointer" data-testid={`card-pair-${pair.symbol}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            {pair.symbol}
                          </span>
                          <PriceChange value={parseFloat(pair.priceChange24h)} />
                        </div>
                        <div className="text-2xl font-bold font-mono mb-4" data-testid={`text-price-${pair.symbol}`}>
                          ${parseFloat(pair.currentPrice).toLocaleString()}
                        </div>
                        <MiniChart
                          data={generateMockChartData()}
                          isPositive={parseFloat(pair.priceChange24h) >= 0}
                        />
                        <div className="flex justify-between mt-4 text-xs text-muted-foreground">
                          <span>Vol: ${parseFloat(pair.volume24h).toLocaleString()}</span>
                          <span>
                            H: ${parseFloat(pair.high24h).toLocaleString()} L: ${parseFloat(pair.low24h).toLocaleString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Gainers and Losers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Gainers */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-foreground">Top Gainers (24h)</h3>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {topGainers?.slice(0, 5).map((pair) => (
                    <Link key={pair.id} href={`/spot?pair=${pair.symbol}`}>
                      <a>
                        <div
                          className="flex items-center justify-between p-4 hover-elevate"
                          data-testid={`row-gainer-${pair.symbol}`}
                        >
                          <div>
                            <div className="font-medium text-foreground">{pair.symbol}</div>
                            <div className="text-xs text-muted-foreground">
                              Vol: ${parseFloat(pair.volume24h).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-medium text-foreground">
                              ${parseFloat(pair.currentPrice).toLocaleString()}
                            </div>
                            <PriceChange value={parseFloat(pair.priceChange24h)} />
                          </div>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Losers */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-foreground">Top Losers (24h)</h3>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {topLosers?.slice(0, 5).map((pair) => (
                    <Link key={pair.id} href={`/spot?pair=${pair.symbol}`}>
                      <a>
                        <div
                          className="flex items-center justify-between p-4 hover-elevate"
                          data-testid={`row-loser-${pair.symbol}`}
                        >
                          <div>
                            <div className="font-medium text-foreground">{pair.symbol}</div>
                            <div className="text-xs text-muted-foreground">
                              Vol: ${parseFloat(pair.volume24h).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-medium text-foreground">
                              ${parseFloat(pair.currentPrice).toLocaleString()}
                            </div>
                            <PriceChange value={parseFloat(pair.priceChange24h)} />
                          </div>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
