
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/contexts/WalletContext';
import { useWallets, usePrivy } from '@privy-io/react-auth';
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
  const { wallet } = useWallet();
  const { wallets } = useWallets();
  const { ready, authenticated } = usePrivy();
  const { toast } = useToast();

  const isWalletReady = ready && authenticated && wallets.length > 0;

  const { data: tokenAddresses } = useQuery({
    queryKey: ['/api/tokens', wallet.chainId],
    queryFn: () => getTokens(wallet.chainId?.toString() || '8453'),
    enabled: !!wallet.chainId,
  });

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const connectedWallet = wallets[0];
      if (!isWalletReady || !connectedWallet) throw new Error('Wallet not ready or not connected');
      if (!tokenAddresses) throw new Error('Token addresses not loaded');

      const provider = await connectedWallet.getEthersProvider();
      const signer = provider.getSigner();

      const { chainId } = await provider.getNetwork();

      const [baseAsset, quoteAsset] = symbol.split('/');

      const tokenIn = side === 'buy' ? quoteAsset : baseAsset;
      const tokenOut = side === 'buy' ? baseAsset : quoteAsset;

      const intent = {
        user: connectedWallet.address,
        tokenIn: tokenAddresses[tokenIn],
        tokenOut: tokenAddresses[tokenOut],
        amountIn: ethers.parseUnits(amount, 6).toString(),
        price: ethers.parseUnits(price, 6).toString(),
        nonce: Date.now(),
      };

      const domain = {
        name: 'IntentSpotRouter',
        version: '1',
        chainId: chainId,
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

      const signature = await signer.signTypedData(domain, types, intent);

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

  const getButtonText = () => {
    if (disabled) return 'Coming Soon';
    if (!ready || !authenticated) return 'Wallet Not Connected';
    if (!isWalletReady) return 'Wallet Loading...';
    return 'Place Order';
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <Tabs value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mb-4">
          <Tabs value={orderType} onValueChange={(v) => setOrderType(v as 'limit' | 'market')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="limit">Limit</TabsTrigger>
              <TabsTrigger value="market">Market</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

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
          disabled={disabled || placeOrderMutation.isPending || !isWalletReady}
        >
          {getButtonText()}
        </Button>
      </CardContent>
    </Card>
  );
}
