import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RELAYER_URL } from '../config';

// The API returns bids and asks as arrays of [price, amount] tuples.
interface OrderbookData {
  bids: [string, string][];
  asks: [string, string][];
}

export function OrderBook() { // Removed props, it will fetch its own data.
  const [data, setData] = useState<OrderbookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrderbook = async () => {
      try {
        const response = await fetch(`${RELAYER_URL}/orderbook?market=WETH-USDC`);
        if (!response.ok) {
          throw new Error('Failed to fetch order book');
        }
        const fetchedData: OrderbookData = await response.json();
        setData(fetchedData);
      } catch (error) {
        console.error("Error fetching orderbook:", error);
      } finally {
        setIsLoading(false); // Set loading to false after first fetch attempt
      }
    };

    fetchOrderbook(); // Initial fetch
    const interval = setInterval(fetchOrderbook, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, []); // Empty dependency array means this runs once on mount

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Order Book</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
       <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Order Book</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
            <p>Could not load order book.</p>
        </CardContent>
      </Card>
    )
  }

  const {bids, asks} = data;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-sm">Order Book</CardTitle>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
          <div>Price (USDC)</div>
          <div className="text-right">Amount (WETH)</div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 overflow-auto">
        {/* Asks (Sell Orders) */}
        <div className="mb-2">
          {asks.slice(0, 12).reverse().map(([price, amount], i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-2 text-xs py-1"
              data-testid={`row-ask-${i}`}>
              <div className="font-mono text-destructive">{price}</div>
              <div className="font-mono text-right">{amount}</div>
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className="my-3 py-2 border-y border-border">
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg font-bold font-mono text-chart-2" data-testid="text-spread-price">
              {asks[0]?.[0] || '0.00'}
            </span>
            <span className="text-xs text-muted-foreground">
              ↑ ${(parseFloat(asks[0]?.[0] || '0') - parseFloat(bids[0]?.[0] || '0')).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        <div>
          {bids.slice(0, 12).map(([price, amount], i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-2 text-xs py-1"
              data-testid={`row-bid-${i}`}>
              <div className="font-mono text-chart-2">{price}</div>
              <div className="font-mono text-right">{amount}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
