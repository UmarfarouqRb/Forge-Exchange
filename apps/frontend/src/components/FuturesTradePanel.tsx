import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useVaultBalance } from '@/hooks/useVaultBalance';
import { TOKENS, Token } from '@/config/contracts';
import { formatUnits } from 'viem';

interface FuturesTradePanelProps {
  symbol: string;
  currentPrice: string;
  isMobile?: boolean;
}

export function FuturesTradePanel({ symbol, currentPrice, isMobile = false }: FuturesTradePanelProps) {
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState(currentPrice);
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(10);
  const navigate = useNavigate();

  const baseCurrency = symbol.replace('USDT', '') as Token;
  const quoteCurrency = 'USDT' as Token;
  const quoteToken = TOKENS[quoteCurrency];

  const { data: quoteBalance } = useVaultBalance(quoteToken?.address);

  const total = useMemo(() => {
    const priceValue = parseFloat(orderType === 'limit' ? price : currentPrice);
    const amountValue = parseFloat(amount);
    if (isNaN(priceValue) || isNaN(amountValue) || amountValue === 0) {
        return 0;
    }
    return (priceValue * amountValue) / leverage;
  }, [amount, price, currentPrice, orderType, leverage]);

  const handlePlaceOrder = () => {
    // Placeholder for order placement logic
    console.log({ 
      symbol, 
      orderType, 
      side, 
      price, 
      amount, 
      leverage, 
    });
  };

  if (isMobile) {
    return (
      <div className="p-2 bg-background h-full flex flex-col">
        <Tabs value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')} className="mb-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="data-[state=active]:bg-green-500 data-[state=active]:text-primary-foreground">Long</TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-red-500 data-[state=active]:text-primary-foreground">Short</TabsTrigger>
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
            placeholder={`Quantity (${baseCurrency})`}
          />
          <span className="text-sm text-muted-foreground p-2">{baseCurrency}</span>
        </div>

        <div className="mb-2">
          <Slider
            value={[leverage]}
            onValueChange={(value) => setLeverage(value[0])}
            min={1}
            max={100}
            step={1}
          />
          <div className="flex justify-between text-xs mt-1">
            <span>1x</span>
            <span className="font-semibold">{leverage}x</span>
            <span>100x</span>
          </div>
        </div>
        
        <div className="mb-2 p-2 bg-input rounded-md">
          <span className="text-sm text-muted-foreground">Collateral</span>
          <span className="text-lg font-mono float-right">{total.toFixed(2)} USDT</span>
        </div>

        <div className="mb-2 flex items-center">
            <input type="checkbox" id="tp_sl_mobile" className="mr-2" />
            <label htmlFor="tp_sl_mobile" className="text-sm">TP/SL</label>
        </div>
        
        <div className="text-sm text-muted-foreground mb-2">
          Available: {quoteBalance ? formatUnits(quoteBalance, quoteToken.decimals) : '0'} USDT
        </div>

        <div className="flex-grow"></div>
        
        <Button
          className={`w-full text-lg p-6 ${side === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
          onClick={handlePlaceOrder}
        >
          {side === 'buy' ? 'Open Long' : 'Open Short'}
        </Button>
      </div>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-4">Trade</h3>
          <Tabs value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy" className="data-[state=active]:bg-green-500 data-[state=active]:text-primary-foreground">Long</TabsTrigger>
              <TabsTrigger value="sell" className="data-[state=active]:bg-red-500 data-[state=active]:text-primary-foreground">Short</TabsTrigger>
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

          <div className="mb-4">
            <Label htmlFor="amount">Amount ({baseCurrency})</Label>
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <Label htmlFor="leverage">Leverage</Label>
                <span className="text-sm font-semibold">{leverage}x</span>
            </div>
            <Slider
              id="leverage"
              value={[leverage]}
              onValueChange={(value) => setLeverage(value[0])}
              min={1}
              max={100}
              step={1}
            />
          </div>

          <div className="mb-4 p-2 bg-muted/40 rounded-md">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Collateral</span>
                <span className="font-mono">{total.toFixed(2)} USDT</span>
              </div>
          </div>
          
          <div className="mb-4 flex items-center">
            <input type="checkbox" id="tp_sl_desktop" className="mr-2" />
            <label htmlFor="tp_sl_desktop" className="text-sm">Take Profit / Stop Loss</label>
          </div>
        </div>
        
        <div className="mt-auto">
            <div className="text-sm text-muted-foreground mb-2 text-center">
              Available: {quoteBalance ? formatUnits(quoteBalance, quoteToken.decimals) : '0'} USDT
            </div>
            <Button
                className={`w-full text-lg p-6 ${side === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                onClick={handlePlaceOrder}
            >
                {side === 'buy' ? `Long ${baseCurrency}` : `Short ${baseCurrency}`}
            </Button>

            <div className="flex mt-2 space-x-2">
              <Button onClick={() => navigate(`/assets/deposit?asset=${quoteCurrency}`)} className="w-full">Deposit</Button>
              <Button onClick={() => navigate(`/assets/withdraw?asset=${quoteCurrency}`)} className="w-full">Withdraw</Button>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
