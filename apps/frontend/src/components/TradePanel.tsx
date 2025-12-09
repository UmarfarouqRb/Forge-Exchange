import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface TradePanelProps {
  symbol: string;
  currentPrice: string;
  type?: 'spot' | 'futures';
}

export function TradePanel({ symbol, currentPrice, type = 'spot' }: TradePanelProps) {
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState(currentPrice);
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState([1]);
  const { wallet } = useWallet();
  const { toast } = useToast();

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest('POST', '/api/orders', orderData);
    },
    onSuccess: () => {
      toast({
        title: 'Order Placed',
        description: `${side.toUpperCase()} order for ${amount} ${symbol} placed successfully`,
      });
      setAmount('');
      // Invalidate all order queries for this wallet
      if (wallet.address) {
        queryClient.invalidateQueries({ queryKey: ['/api/orders', wallet.address] });
        queryClient.invalidateQueries({ queryKey: ['/api/orders', type, wallet.address] });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Order Failed',
        description: error.message || 'Failed to place order',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!wallet.isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to place orders',
        variant: 'destructive',
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    const orderData = {
      walletAddress: wallet.address,
      symbol,
      orderType,
      side,
      price: orderType === 'limit' ? price : null,
      amount,
      total: (parseFloat(amount) * parseFloat(orderType === 'limit' ? price : currentPrice)).toString(),
      category: type,
      leverage: type === 'futures' ? leverage[0] : 1,
    };

    placeOrderMutation.mutate(orderData);
  };

  const total = parseFloat(amount || '0') * parseFloat(orderType === 'limit' ? price : currentPrice);

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <Tabs value={side} onValueChange={(v) => setSide(v as any)} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="data-[state=active]:bg-chart-2 data-[state=active]:text-white" data-testid="tab-buy">
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-destructive data-[state=active]:text-white" data-testid="tab-sell">
              Sell
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Order Type */}
        <div className="mb-4">
          <Tabs value={orderType} onValueChange={(v) => setOrderType(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="limit" data-testid="tab-limit">Limit</TabsTrigger>
              <TabsTrigger value="market" data-testid="tab-market">Market</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Leverage (Futures only) */}
        {type === 'futures' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">Leverage</Label>
              <span className="text-sm font-bold font-mono">{leverage[0]}x</span>
            </div>
            <Slider
              value={leverage}
              onValueChange={setLeverage}
              min={1}
              max={125}
              step={1}
              className="mb-2"
              data-testid="slider-leverage"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1x</span>
              <span>125x</span>
            </div>
          </div>
        )}

        {/* Price */}
        {orderType === 'limit' && (
          <div className="mb-4">
            <Label htmlFor="price" className="text-sm mb-2 block">
              Price
            </Label>
            <div className="relative">
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pr-16 font-mono"
                data-testid="input-price"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                USDT
              </span>
            </div>
          </div>
        )}

        {/* Amount */}
        <div className="mb-4">
          <Label htmlFor="amount" className="text-sm mb-2 block">
            Amount
          </Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="pr-16 font-mono"
              data-testid="input-amount"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {symbol.replace('USDT', '')}
            </span>
          </div>
          <div className="flex gap-2 mt-2">
            {[25, 50, 75, 100].map((percent) => (
              <Button
                key={percent}
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => setAmount((100 / percent).toString())}
                data-testid={`button-percent-${percent}`}
              >
                {percent}%
              </Button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono font-medium" data-testid="text-total">
              {total.toFixed(2)} USDT
            </span>
          </div>
        </div>

        {/* Available Balance */}
        <div className="mb-4 p-3 bg-muted rounded-md">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Available</span>
            <span className="font-mono font-medium">
              {wallet.isConnected ? '10,000.00 USDT' : '-- USDT'}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          className="w-full"
          variant={side === 'buy' ? 'default' : 'destructive'}
          onClick={handleSubmit}
          disabled={placeOrderMutation.isPending || !wallet.isConnected}
          data-testid="button-place-order"
        >
          {!wallet.isConnected
            ? 'Connect Wallet'
            : placeOrderMutation.isPending
            ? 'Placing Order...'
            : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol.replace('USDT', '')}`}
        </Button>
      </CardContent>
    </Card>
  );
}
