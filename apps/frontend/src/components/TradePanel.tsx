
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/contexts/WalletContext';
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import { useSubmitIntent } from '@/hooks/useSubmitIntent';

interface TradePanelProps {
  symbol: string;
  currentPrice: string;
  disabled?: boolean;
}

export function TradePanel({ symbol, currentPrice, disabled = false }: TradePanelProps) {
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState(currentPrice);
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5'); // Default slippage percentage
  const { wallet } = useWallet();
  const { ready, authenticated } = usePrivy();
  const { toast } = useToast();
  const submitIntent = useSubmitIntent();

  const handleSubmit = async () => {
    if (!wallet.isConnected) {
      toast({ title: 'Wallet Not Connected', variant: 'destructive' });
      return;
    }

    submitIntent.mutate({ 
      symbol, 
      orderType, 
      side, 
      price, 
      currentPrice, 
      amount, 
      slippage 
    });
  };

  const total = parseFloat(amount || '0') * parseFloat(orderType === 'limit' ? price : currentPrice);

  const getButtonText = () => {
    if (disabled) return 'Coming Soon';
    if (!ready || !authenticated) return 'Wallet Not Connected';
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

        {orderType === 'market' && (
           <div className="mb-4">
            <Label htmlFor="slippage">Slippage (%)</Label>
            <Input id="slippage" type="number" value={slippage} onChange={(e) => setSlippage(e.target.value)} />
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
          disabled={disabled || submitIntent.isPending || !ready || !authenticated}
        >
          {getButtonText()}
        </Button>
      </CardContent>
    </Card>
  );
}
