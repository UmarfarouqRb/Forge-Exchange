import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PriceChange } from '@/components/PriceChange';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  FiArrowRight, 
  FiTrendingUp, 
  FiActivity, 
  FiShield, 
  FiZap, 
  FiGlobe, 
  FiLock,
  FiDollarSign,
  FiClock
} from 'react-icons/fi';
import type { TradingPair } from '../types';

declare global {
  interface Window {
    TradingView?: {
        widget: new (options: Record<string, unknown>) => void;
    };
  }
}

export default function Home() {
  const { data: topGainers } = useQuery<TradingPair[]>({
    queryKey: ['/api/trading-pairs/top-gainers'],
  });

  const { data: topLosers } = useQuery<TradingPair[]>({
    queryKey: ['/api/trading-pairs/top-losers'],
  });

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: '100%',
      height: 490,
      defaultColumn: 'overview',
      screener_type: 'crypto_mkt',
      displayCurrency: 'USD',
      colorTheme: 'dark',
      locale: 'en',
      isTransparent: true
    });

    const widgetContainer = document.getElementById('tradingview-widget');
    if (widgetContainer && !widgetContainer.querySelector('script')) {
      widgetContainer.appendChild(script);
    }

    return () => {
      if (widgetContainer) {
        widgetContainer.innerHTML = '';
      }
    };
  }, []);

  const features = [
    {
      icon: FiShield,
      title: 'Secure Trading',
      description: 'Multi-chain support with industry-leading security protocols'
    },
    {
      icon: FiZap,
      title: 'Lightning Fast',
      description: 'Execute trades instantly with our high-performance engine'
    },
    {
      icon: FiGlobe,
      title: 'Multi-Chain',
      description: 'Trade across BASE, BNB Chain, Arbitrum, and SUI networks'
    },
    {
      icon: FiLock,
      title: 'Non-Custodial',
      description: 'Your keys, your crypto. Full control of your assets'
    },
    {
      icon: FiDollarSign,
      title: 'Low Fees',
      description: 'Competitive trading fees starting from 0.1%'
    },
    {
      icon: FiClock,
      title: '24/7 Trading',
      description: 'Trade anytime, anywhere with our always-on platform'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(27,87%,61%)]/10 via-background to-[hsl(214,66%,54%)]/10" />
        <div className="relative container mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block mb-4 px-4 py-2 rounded-full bg-accent/20 border border-accent/30">
              <span className="text-sm font-medium text-accent-foreground">
                Trade with Confidence
              </span>
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-[hsl(27,87%,61%)] via-[hsl(45,93%,58%)] to-[hsl(214,66%,54%)] bg-clip-text text-transparent">
              Decentralized Trading,
              <br />
              Simplified
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
              Trade cryptocurrency across multiple chains with professional tools, real-time data, and complete control
            </p>
            <p className="text-sm sm:text-base text-muted-foreground/80 mb-8">
              No KYC • Low Fees • Lightning Fast Execution
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button asChild size="lg" className="w-full sm:w-auto text-base px-8">
                    <Link to="/spot" data-testid="button-start-trading">
                        Start Trading Now
                        <FiArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-base px-8">
                    <Link to="/market" data-testid="button-view-markets">
                        Explore Markets
                    </Link>
                </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Market Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          <Card className="border-border/50 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                24h Trading Volume
              </CardTitle>
              <FiActivity className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground" data-testid="text-volume-24h">
                $2.4B
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across all pairs</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Traders
              </CardTitle>
              <FiTrendingUp className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground" data-testid="text-active-traders">
                124,567
              </div>
              <p className="text-xs text-chart-2 mt-1">+12.5% from yesterday</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover-elevate sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Trading Pairs
              </CardTitle>
              <FiGlobe className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground" data-testid="text-trading-pairs">
                250+
              </div>
              <p className="text-xs text-muted-foreground mt-1">Spot & Futures</p>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Why Choose Forge Exchange
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for traders who demand speed, security, and seamless multi-chain trading
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-border/50 hover-elevate">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Live Market Data - TradingView Widget */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Live Market Overview
              </h2>
              <p className="text-sm text-muted-foreground">
                Real-time cryptocurrency prices powered by TradingView
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
                <Link to="/market" data-testid="link-view-all-markets">
                    View All Markets
                    <FiArrowRight className="ml-2 w-4 h-4" />
                </Link>
            </Button>
          </div>
          
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="tradingview-widget-container" id="tradingview-widget">
                <div className="tradingview-widget-container__widget"></div>
                <div className="flex items-center justify-center py-12">
                  <Skeleton className="h-[490px] w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Gainers and Losers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Top Gainers */}
          <div>
            <h3 className="text-xl sm:text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
              <FiTrendingUp className="text-chart-2" />
              Top Gainers (24h)
            </h3>
            <Card className="border-border/50">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {topGainers?.slice(0, 5).map((pair) => (
                    <Link key={pair.id} to={`/spot?pair=${pair.symbol}`}>
                      <div
                        className="flex items-center justify-between p-4 hover-elevate transition-colors cursor-pointer"
                        data-testid={`row-gainer-${pair.symbol}`}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-foreground">{pair.symbol}</div>
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
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Losers */}
          <div>
            <h3 className="text-xl sm:text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
              <FiActivity className="text-chart-1" />
              Top Losers (24h)
            </h3>
            <Card className="border-border/50">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {topLosers?.slice(0, 5).map((pair) => (
                    <Link key={pair.id} to={`/spot?pair=${pair.symbol}`}>
                      <div
                        className="flex items-center justify-between p-4 hover-elevate transition-colors cursor-pointer"
                        data-testid={`row-loser-${pair.symbol}`}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-foreground">{pair.symbol}</div>
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
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 mb-8">
          <Card className="border-border/50 bg-gradient-to-br from-accent/5 via-background to-accent/10 overflow-hidden">
            <CardContent className="p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-4">
                Ready to Start Trading?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Connect your wallet and start trading on multiple chains with professional tools and real-time market data
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="w-full sm:w-auto px-8">
                    <Link to="/spot" data-testid="button-cta-spot">
                        Trade Spot
                        <FiArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto px-8">
                    <Link to="/futures" data-testid="button-cta-futures">
                        Trade Futures
                    </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
