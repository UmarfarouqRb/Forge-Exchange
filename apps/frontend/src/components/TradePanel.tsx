
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { placeOrder, getTokens } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { ethers } from 'ethers';

interface TradePanelProps {
  symbol: string;
  currentPrice: string;
  type?: 'spot' | 'futures';
  disabled?: boolean;
}

export function TradePanel({ symbol, currentPrice, type = 'spot', disabled = false }: TradePanelProps) {
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState(currentPrice);
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState([1]);
  const { wallet } = useWallet();
  const { toast } = useToast();

  const { data: tokenAddresses } = useQuery({
    queryKey: ['/api/tokens', wallet.chainId], 
    queryFn: () => getTokens(wallet.chainId?.toString() || '8453'), 
    enabled: !!wallet.chainId,
  });

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!wallet.signer) throw new Error('Wallet not connected');
      if (!tokenAddresses) throw new Error('Token addresses not loaded');

      const [baseAsset, quoteAsset] = symbol.split('/');

      const tokenIn = side === 'buy' ? quoteAsset : baseAsset;
      const tokenOut = side === 'buy' ? baseAsset : quoteAsset;

      const intent = {
        user: wallet.address,
        tokenIn: tokenAddresses[tokenIn],
        tokenOut: tokenAddresses[tokenOut],
        amountIn: ethers.parseUnits(amount, 6).toString(),
        price: ethers.parseUnits(price, 6).toString(),
        nonce: Date.now(),
      };

      const domain = {
        name: 'IntentSpotRouter',
        version: '1',
        chainId: await wallet.signer.getChainId(),
        verifyingContract: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9', 
      };

      const types = {
        Intent: [
          { name: 'user', type: 'address' },
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'price', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
        ],
      };

      const signature = await wallet.signer.signTypedData(domain, types, intent);

      return placeOrder({ intent, signature });
    },
    onSuccess: () => {
      toast({
        title: 'Order Placed',
        description: `${side.toUpperCase()} order for ${amount} ${symbol} placed successfully`,
      });
      setAmount('');
      if (wallet.address) {
        queryClient.invalidateQueries({ queryKey: ['/api/orders', wallet.address] });
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

  const handleSubmit = async () => {
    if (!wallet.isConnected) {
      toast({ title: 'Wallet Not Connected', variant: 'destructive' });
      return;
    }
    placeOrderMutation.mutate();
  };

  const total = parseFloat(amount || '0') * parseFloat(orderType === 'limit' ? price : currentPrice);

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <Tabs value={side} onValueChange={(v) => setSide(v as any)} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mb-4">
          <Tabs value={orderType} onValueChange={(v) => setOrderType(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="limit">Limit</TabsTrigger>
              <TabsTrigger value="market">Market</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {type === 'futures' && (
          <div className="mb-4">
            {/* ... Leverage UI ... */}
          </div>
        )}

        {orderType === 'limit' && (
          <div className="mb-4">
            <Label htmlFor="price">Price</Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        )}

        <div className="mb-4">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div className="mb-4">
            <span>Total: {total.toFixed(2)} USDT</span>
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={disabled || placeOrderMutation.isPending || !wallet.isConnected}
        >
          {disabled ? 'Coming Soon' : 'Place Order'}
        </Button>
      </CardContent>
    </Card>
  );
}
