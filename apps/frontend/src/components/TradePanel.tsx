import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useWallet } from '@/contexts/WalletContext';
import { useSession } from '@/contexts/SessionContext';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ethers } from 'ethers';

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
  const { sessionKey, isSessionAuthorized, authorizeSession } = useSession();
  const { toast } = useToast();

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
        if (!sessionKey) throw new Error('Session key not available');

        const order = {
            user: wallet.address,
            tokenIn: side === 'buy' ? 'USDT' : symbol.replace('USDT', ''),
            tokenOut: side === 'buy' ? symbol.replace('USDT', '') : 'USDT',
            amountIn: ethers.utils.parseUnits(amount, 6).toString(),
            minAmountOut: '0', // You might want to calculate a proper slippage amount
            nonce: Date.now(),
        };

        const orderHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['(address,address,address,uint256,uint256,uint256)'], [Object.values(order)]));
        const sessionKeySignature = await sessionKey.signMessage(ethers.utils.arrayify(orderHash));

        return apiRequest('POST', '/api/spot', { order, sessionKeySignature });
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

    if (!isSessionAuthorized) {
        await authorizeSession();
    }

    placeOrderMutation.mutate({});
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
          disabled={placeOrderMutation.isPending || !wallet.isConnected}
        >
          {isSessionAuthorized ? 'Place Order' : 'Authorize Session'}
        </Button>
      </CardContent>
    </Card>
  );
}
