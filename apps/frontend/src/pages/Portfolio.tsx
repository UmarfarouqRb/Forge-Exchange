
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAssets } from '@/lib/api';
import { useWallet } from '@/contexts/WalletContext';

// Define a type for our asset object
interface Asset {
  symbol: string;
  name: string;
  balance: number;
  value: number;
}

export default function Portfolio() {
  const { wallet } = useWallet();
  const { data: assets = [], isLoading, isError } = useQuery<Asset[]>({
    queryKey: ['/api/assets', wallet.address],
    queryFn: () => getAssets(wallet.address),
    enabled: !!wallet.address,
  });

  // Add explicit types for the reducer and the handler
  const totalValue = assets.reduce((acc: number, asset: Asset) => acc + asset.value, 0);
  const [change] = useState(2.5); // Mock change

  const handleTrade = (symbol: string) => {
    // For now, just log to console. We can implement navigation later.
    console.log(`Trading ${symbol}`);
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading assets...</div>;
  }

  if (isError) {
    return <div className="text-center p-4 text-red-500">Error fetching assets.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Portfolio Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">24h Change</p>
              <p className={`text-2xl font-bold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {change >= 0 ? '+' : ''}${change.toFixed(2)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="spot">
        <TabsList>
          <TabsTrigger value="spot">Spot</TabsTrigger>
          <TabsTrigger value="futures">Futures</TabsTrigger>
        </TabsList>
        <TabsContent value="spot">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.map((asset: Asset) => (
                <Card key={asset.symbol}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{asset.symbol}</CardTitle>
                    <p className="text-xs text-muted-foreground">{asset.name}</p>
                    </CardHeader>
                    <CardContent>
                    <div className="text-lg font-bold">{asset.balance}</div>
                    <p className="text-xs text-muted-foreground">${asset.value.toLocaleString()}</p>
                    <button 
                        className="text-sm text-blue-500 hover:underline mt-2" 
                        onClick={() => handleTrade(asset.symbol)}>
                        Trade
                    </button>
                    </CardContent>
                </Card>
                ))}
            </div>
        </TabsContent>
        <TabsContent value="futures">
          <p className="text-center p-4 text-muted-foreground">Futures portfolio coming soon.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
