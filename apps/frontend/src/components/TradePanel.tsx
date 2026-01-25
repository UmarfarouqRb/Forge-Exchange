
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSubmitIntent } from '@/hooks/useSubmitIntent';
import { useVaultBalance } from '@/hooks/useVaultBalance';
import { TOKENS, Token } from '@/config/contracts';
import { parseUnits, formatUnits } from 'viem';
import { OrderConfirmationDialog } from './OrderConfirmationDialog';
import { Orders } from './Orders';
import { TradeHistory } from './TradeHistory';
import { OrderTypeSelector } from './OrderTypeSelector';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNavigate } from 'react-router-dom';

interface TradePanelProps {
  symbol: string;
  currentPrice: string;
  disabled?: boolean;
  isMobile?: boolean;
}

export function TradePanel({ symbol, currentPrice, disabled = false, isMobile = false }: TradePanelProps) {
  const [orderType, setOrderType] = useState<'limit' | 'market'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState(currentPrice);
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('0.05');
  const [isConfirming, setIsConfirming] = useState(false);
  const { ready, authenticated, user, login } = usePrivy();
  const { wallets } = useWallets();
  const submitIntent = useSubmitIntent();
  const navigate = useNavigate();

  const connectedWallet = wallets[0];

  // Update price when currentPrice prop changes
  useEffect(() => {
    if (orderType === 'limit') {
      setPrice(currentPrice);
    }
  }, [currentPrice, orderType]);

  const baseCurrency = symbol.replace('USDT', '') as Token;
  const quoteCurrency = 'USDT' as Token;

  const baseToken = TOKENS[baseCurrency];
  const quoteToken = TOKENS[quoteCurrency];

  const { data: baseBalance } = useVaultBalance(baseToken?.address);
  const { data: quoteBalance } = useVaultBalance(quoteToken?.address);

  const total = parseFloat(amount || '0') * parseFloat(orderType === 'limit' ? price : currentPrice);

  const hasSufficientBalance = useMemo(() => {
    if (!amount) return true;

    if (side === 'buy') {
      if (!quoteBalance || !quoteToken) return false;
      const totalAmount = parseUnits(total.toString(), quoteToken.decimals);
      return quoteBalance >= totalAmount;
    } else {
      if (!baseBalance || !baseToken) return false;
      const orderAmount = parseUnits(amount, baseToken.decimals);
      return baseBalance >= orderAmount;
    }
  }, [amount, side, baseBalance, quoteBalance, baseToken, quoteToken, total]);

  const handlePlaceOrder = () => {
    if (!authenticated) {
      login();
      return;
    }
    if (!hasSufficientBalance) {
      return;
    }
    setIsConfirming(true);
  };

  const handleConfirmOrder = () => {
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

  const getButtonText = () => {
    if (disabled) return 'Disabled';
    if (submitIntent.isPending) return 'Processing...';
    if (!ready) return 'Initializing...';
    if (!authenticated) return 'Connect Wallet';
    if (authenticated && !connectedWallet) return 'Creating Wallet...';
    if (!hasSufficientBalance) return 'Insufficient Funds';
    return side === 'buy' ? `Buy ${baseCurrency}` : `Sell ${baseCurrency}`;
  }

  if (isMobile) {
    return (
      <div className="p-2 bg-background h-full flex flex-col">
         <ToggleGroup type="single" value={side} onValueChange={(value: 'buy' | 'sell') => {
          if (value) setSide(value);
        }} className="w-full mb-2">
          <ToggleGroupItem value="buy" className="w-full data-[state=on]:bg-blue-500 data-[state=on]:text-primary-foreground">Buy</ToggleGroupItem>
          <ToggleGroupItem value="sell" className="w-full data-[state=on]:bg-orange-500 data-[state=on]:text-primary-foreground">Sell</ToggleGroupItem>
        </ToggleGroup>

        <div className="mb-2">
          <OrderTypeSelector orderType={orderType} setOrderType={setOrderType} />
        </div>

        {orderType === 'limit' && (
          <div className="mb-2 flex items-center bg-input rounded-md">
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-2/3 bg-transparent border-0"
              placeholder="Price (USDT)"
            />
            <span className="text-sm text-muted-foreground p-2">BBO</span>
          </div>
        )}

        <div className="mb-2 flex items-center bg-input rounded-md">
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-2/3 bg-transparent border-0"
            placeholder={`Quantity (${baseCurrency})`}
          />
          <span className="text-sm text-muted-foreground p-2">{baseCurrency}</span>
        </div>
        
        <div className="mb-2 p-2 bg-input rounded-md">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-mono float-right">{total.toFixed(2)} USDT</span>
        </div>
        
        <div className="mb-2 flex items-center">
          <input type="checkbox" id="tp_sl" className="mr-2" />
          <label htmlFor="tp_sl" className="text-sm">TP/SL</label>
        </div>
        
        <div className="text-sm text-muted-foreground mb-2">
          Available: {quoteBalance ? formatUnits(quoteBalance, quoteToken.decimals) : '0'} USDT
        </div>

        <div className="flex-grow"></div>

        <div className="mb-4">
          <div className="mt-2">
              <Button onClick={() => navigate('/assets/deposit')} variant="outline" size="sm" className="w-full">Deposit</Button>
          </div>
          <div className="mt-2">
              <Button onClick={() => navigate('/assets/withdraw')} variant="outline" size="sm" className="w-full">Withdraw</Button>
          </div>
        </div>
        
        <Button
          className={`w-full text-lg p-6 ${side === 'buy' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'} ${submitIntent.isPending ? 'animate-pulse' : ''}`}
          onClick={handlePlaceOrder}
          disabled={disabled || submitIntent.isPending || !ready || (authenticated && !connectedWallet) || !hasSufficientBalance}
        >
          {getButtonText()}
        </Button>
      </div>
    )
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <Tabs defaultValue="orders">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">Open Orders</TabsTrigger>
            <TabsTrigger value="history">Trade History</TabsTrigger>
          </TabsList>
          <TabsContent value="orders">
            <Orders />
          </TabsContent>
          <TabsContent value="history">
            <TradeHistory />
          </TabsContent>
        </Tabs>
        <div className="mt-8">
          <h3 className="text-lg font-semibold">Trade</h3>
           <ToggleGroup type="single" value={side} onValueChange={(value: 'buy' | 'sell') => {
            if (value) setSide(value);
          }} className="w-full mb-4">
            <ToggleGroupItem value="buy" className="w-full data-[state=on]:bg-blue-500 data-[state=on]:text-primary-foreground">Buy</ToggleGroupItem>
            <ToggleGroupItem value="sell" className="w-full data-[state=on]:bg-orange-500 data-[state=on]:text-primary-foreground">Sell</ToggleGroupItem>
          </ToggleGroup>

          <div className="mb-4">
            <OrderTypeSelector orderType={orderType} setOrderType={setOrderType} />
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
            <Label htmlFor="amount">Amount ({baseCurrency})</Label>
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="mb-4">
              <span>Total: {total.toFixed(2)} USDT</span>
          </div>

          <Button
            className={`w-full ${side === 'buy' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'} ${submitIntent.isPending ? 'animate-pulse' : ''}`}
            onClick={handlePlaceOrder}
            disabled={disabled || submitIntent.isPending || !ready || (authenticated && !connectedWallet) || !hasSufficientBalance}
          >
            {getButtonText()}
          </Button>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold">Vault</h3>
          <div className="mt-4">
            <Label>USDT Balance: {quoteBalance ? formatUnits(quoteBalance, quoteToken.decimals) : '0'}</Label>
          </div>
          <div className="mt-2">
            <Button onClick={() => navigate('/assets/deposit')} className="w-full">Deposit</Button>
          </div>
          <div className="mt-2">
            <Button onClick={() => navigate('/assets/withdraw')} className="w-full">Withdraw</Button>
          </div>
        </div>

        <OrderConfirmationDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        onConfirm={handleConfirmOrder}
        order={{
          side,
          amount,
          symbol,
          price,
          orderType,
          total
        }}
      />
      </CardContent>
    </Card>
  );
}
