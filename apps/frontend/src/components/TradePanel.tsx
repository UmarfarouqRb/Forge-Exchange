import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePrivy } from '@privy-io/react-auth';
import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { useSubmitIntent } from '@/hooks/useSubmitIntent';
import { useVaultBalance } from '@/hooks/useVaultBalance';
import { TOKENS, Token } from '@/config/contracts';
import { parseUnits, formatUnits } from 'viem';
import { OrderConfirmationDialog } from './OrderConfirmationDialog';
import { Orders } from './Orders';
import { TradeHistory } from './TradeHistory';
import { DepositDialog } from './DepositDialog';
import { WithdrawDialog } from './WithdrawDialog';

interface TradePanelProps {
  symbol: string;
  currentPrice: string;
  disabled?: boolean;
  isMobile?: boolean;
}

export function TradePanel({ symbol, currentPrice, disabled = false, isMobile = false }: TradePanelProps) {
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState(currentPrice);
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('0.05');
  const [isConfirming, setIsConfirming] = useState(false);
  const [depositDialog, setDepositDialog] = useState(false);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const { ready, authenticated } = usePrivy();
  const submitIntent = useSubmitIntent();

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
    if (!authenticated || !hasSufficientBalance) {
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
    if (!ready || !authenticated) return 'Wallet Not Connected';
    if (!hasSufficientBalance) return 'Insufficient Funds';
    return 'Place Order';
  }

  if (isMobile) {
    return (
      <div className="p-2 bg-background h-full flex flex-col">
        <Tabs value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')} className="mb-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="data-[state=active]:bg-green-500 data-[state=active]:text-primary-foreground">Buy</TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-red-500 data-[state=active]:text-primary-foreground">Sell</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mb-2">
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as 'limit' | 'market')}
            className="w-full p-2 rounded-md bg-input"
          >
            <option value="limit">Limit</option>
            <option value="market">Market</option>
          </select>
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
            placeholder="Quantity (BTC)"
          />
          <span className="text-sm text-muted-foreground p-2">BTC</span>
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
              <Button onClick={() => setDepositDialog(true)} variant="outline" size="sm" className="w-full">Deposit</Button>
          </div>
          <div className="mt-2">
              <Button onClick={() => setWithdrawDialog(true)} variant="outline" size="sm" className="w-full">Withdraw</Button>
          </div>
        </div>
        
        <Button
          className={`w-full text-lg p-6 ${side === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
          onClick={handlePlaceOrder}
          disabled={disabled || submitIntent.isPending || !ready || !authenticated || !hasSufficientBalance}
        >
          {side === 'buy' ? 'Buy BTC' : 'Sell BTC'}
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
          <Tabs value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy" className="data-[state=active]:bg-blue-500 data-[state=active]:text-primary-foreground">Buy</TabsTrigger>
              <TabsTrigger value="sell" className="data-[state=active]:bg-orange-500 data-[state=active]:text-primary-foreground">Sell</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mb-4">
            <Tabs value={orderType} onValueChange={(v) => setOrderType(v as 'limit' | 'market')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="market">Market</TabsTrigger>
                <TabsTrigger value="limit">Limit</TabsTrigger>
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
            <Label htmlFor="amount">Amount ({baseCurrency})</Label>
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="mb-4">
              <span>Total: {total.toFixed(2)} USDT</span>
          </div>

          <Button
            className={`w-full ${side === 'buy' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'}`}
            onClick={handlePlaceOrder}
            disabled={disabled || submitIntent.isPending || !ready || !authenticated || !hasSufficientBalance}
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
            <Button onClick={() => setDepositDialog(true)} className="w-full">Deposit</Button>
          </div>
          <div className="mt-2">
            <Button onClick={() => setWithdrawDialog(true)} className="w-full">Withdraw</Button>
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

      <DepositDialog
        open={depositDialog}
        onOpenChange={setDepositDialog}
        asset={quoteCurrency}
      />

      <WithdrawDialog
        open={withdrawDialog}
        onOpenChange={setWithdrawDialog}
        asset={quoteCurrency}
      />
      </CardContent>
    </Card>
  );
}
