
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Market, TradingPair, VaultAsset } from '@/types/market-data';
import { parseUnits } from 'viem';
import { OrderConfirmationDialog } from './OrderConfirmationDialog';
import { OrderTypeSelector } from './OrderTypeSelector';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrder } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { getDisplaySymbol } from '@/utils/tokenDisplay';
import { formatBalance } from '@/lib/format';
import { useVault } from '@/contexts/VaultContext';

interface TradePanelProps {
  pair: TradingPair;
  market?: Market;
  disabled?: boolean;
  isMobile?: boolean;
}

export function SkeletonTradePanel() {
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export function TradePanel({ pair, market, disabled = false, isMobile = false }: TradePanelProps) {
  const [orderType, setOrderType] = useState<'limit' | 'market'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState(market?.lastPrice || '');
  const [amount, setAmount] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const { ready, authenticated, user, login } = usePrivy();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { assets, refetchVault, isLoading } = useVault();

  const addLog = (log: string) => {
    setLogs(prevLogs => [`[${new Date().toLocaleTimeString()}] ${log}`, ...prevLogs]);
  }

  const connectedWallet = wallets[0];
  const currentPrice = market?.lastPrice || '0';

  useEffect(() => {
    if (orderType === 'limit') {
      setPrice(currentPrice);
    }
  }, [currentPrice, orderType]);

  const baseToken = pair?.baseToken;
  const quoteToken = pair?.quoteToken;
  const displayBaseSymbol = baseToken ? getDisplaySymbol(baseToken) : '';
  const displayQuoteSymbol = quoteToken ? getDisplaySymbol(quoteToken) : '';

  const assetMap = useMemo(() => {
    const map: Record<string, VaultAsset> = {};
    if (!assets) return map;
    assets.forEach(a => {
      if (a.token.address) {
        map[a.token.address.toLowerCase()] = a;
      }
    });
    return map;
  }, [assets]);

  const baseAsset = baseToken?.address ? assetMap[baseToken.address.toLowerCase()] : undefined;
  const quoteAsset = quoteToken?.address ? assetMap[quoteToken.address.toLowerCase()] : undefined;

  const total = parseFloat(amount || '0') * parseFloat(orderType === 'limit' ? price : currentPrice);

  const hasSufficientBalance = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return true;

    if (side === 'buy') {
      if (!quoteAsset || !quoteToken) return false;
      const totalAmount = parseUnits(total.toString(), quoteToken.decimals);
      return quoteAsset.balance >= totalAmount;
    } else {
      if (!baseAsset || !baseToken) return false;
      const orderAmount = parseUnits(amount, baseToken.decimals);
      return baseAsset.balance >= orderAmount;
    }
  }, [amount, side, baseAsset, quoteAsset, baseToken, quoteToken, total]);

  const { mutate: submitOrder, isPending: isSubmitting } = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      addLog('Order placed successfully');
      setIsConfirming(false);
      setAmount('');
      refetchVault();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tradeHistory'] });
    },
    onError: (error) => {
      addLog(`Error: ${error.message}`);
      console.error('Failed to create order:', error);
      setIsConfirming(false);
    }
  });

  const handlePlaceOrder = () => {
    addLog('Initiating trade...');
    if (!authenticated) {
      addLog('Please connect your wallet');
      login();
      return;
    }
    if (!hasSufficientBalance) {
      addLog('Insufficient funds');
      return;
    }
    setIsConfirming(true);
  };

  const handleConfirmOrder = () => {
    if (!user?.wallet?.address) return;

    addLog('Submitting order...');
    submitOrder({
      tradingPairId: pair.id,
      side,
      type: orderType,
      quantity: amount,
      price: orderType === 'limit' ? price : undefined,
      userAddress: user.wallet.address,
    });
  };

  const getButtonText = () => {
    if (disabled) return 'Disabled';
    if (isSubmitting) return 'Processing...';
    if (!ready) return 'Initializing...';
    if (!authenticated) return 'Connect Wallet';
    if (authenticated && !connectedWallet) return 'Creating Wallet...';
    if (!hasSufficientBalance) return 'Insufficient Funds';
    return side === 'buy' ? `Buy ${displayBaseSymbol}` : `Sell ${displayBaseSymbol}`;
  }

  const { availableBalance, availableSymbol } = useMemo(() => {
    if (side === 'buy') {
      return {
        availableBalance: quoteAsset && quoteToken ? formatBalance(quoteAsset.balance, quoteToken.decimals) : '0.00',
        availableSymbol: displayQuoteSymbol
      };
    } else { // sell
      return {
        availableBalance: baseAsset && baseToken ? formatBalance(baseAsset.balance, baseToken.decimals) : '0.00',
        availableSymbol: displayBaseSymbol
      };
    }
  }, [side, baseAsset, quoteAsset, baseToken, quoteToken, displayBaseSymbol, displayQuoteSymbol]);

  if (isLoading && assets.length === 0) {
    return <SkeletonTradePanel />;
  }

  if (isMobile) {
    return (
      <div className="p-2 bg-background h-full flex flex-col text-xs">
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
              placeholder={`Price (${displayQuoteSymbol})`}
            />
            <span className="text-xs text-muted-foreground p-2">BBO</span>
          </div>
        )}

        <div className="mb-2 flex items-center bg-input rounded-md">
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-2/3 bg-transparent border-0"
            placeholder={`Quantity (${displayBaseSymbol})`}
          />
          <span className="text-xs text-muted-foreground p-2">{displayBaseSymbol}</span>
        </div>
        
        <div className="mb-2 p-2 bg-input rounded-md">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-mono float-right">{total.toFixed(2)} {displayQuoteSymbol}</span>
        </div>
        
        <div className="mb-2 flex items-center">
          <input type="checkbox" id="tp_sl" className="mr-2" />
          <label htmlFor="tp_sl" className="text-xs">TP/SL</label>
        </div>
        
        <div className="text-xs text-muted-foreground mb-2">
            Available: {availableBalance} {availableSymbol}
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
          className={`w-full text-base p-6 ${side === 'buy' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'} ${isSubmitting ? 'animate-pulse' : ''}`}
          onClick={handlePlaceOrder}
          disabled={disabled || isSubmitting || !ready || (authenticated && !connectedWallet) || !hasSufficientBalance}
        >
          {getButtonText()}
        </Button>

        {logs.length > 0 && (
          <div className="mt-4 p-4 border rounded-lg shadow-inner bg-background/50 h-40 overflow-y-auto">
            <h4 className="font-bold text-sm mb-2">Trade Log</h4>
            <div className="space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="text-xs text-gray-400 font-mono break-all">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="h-full bg-transparent border-0 md:border">
      <CardContent className="p-0 md:p-4 text-xs">
        <div className="mt-0">
          <h3 className="text-base font-semibold mb-4">Trade</h3>
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
              <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={`Price (${displayQuoteSymbol})`} className="bg-white/5 border" />
            </div>
          )}

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <Label htmlFor="amount">Amount</Label>
                <span className="text-xs text-muted-foreground">Available: {availableBalance} {availableSymbol}</span>
            </div>
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="bg-white/5 border" />
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <Label>Total</Label>
            </div>
            <div className="p-2 bg-white/5 rounded-md text-right font-mono">
                {total.toFixed(4)} {displayQuoteSymbol}
            </div>
          </div>
          
          <div className="flex gap-2 mt-4 mb-4">
            <Button onClick={() => navigate('/assets/deposit')} variant="outline" size="sm" className="w-full">Deposit</Button>
            <Button onClick={() => navigate('/assets/withdraw')} variant="outline" size="sm" className="w-full">Withdraw</Button>
          </div>

          <Button
            className={`w-full ${side === 'buy' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'} ${isSubmitting ? 'animate-pulse' : ''}`}
            onClick={handlePlaceOrder}
            disabled={disabled || isSubmitting || !ready || (authenticated && !connectedWallet) || !hasSufficientBalance || !amount}
          >
            {getButtonText()}
          </Button>
        </div>

        <OrderConfirmationDialog
          open={isConfirming}
          onOpenChange={setIsConfirming}
          onConfirm={handleConfirmOrder}
          order={{
            side,
            amount,
            symbol: pair.symbol,
            price,
            orderType,
            total
          }}
        />

        {logs.length > 0 && (
          <div className="mt-4 p-4 border rounded-lg shadow-inner bg-background/50 h-40 overflow-y-auto">
            <h4 className="font-bold text-sm mb-2">Trade Log</h4>
            <div className="space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="text-xs text-gray-400 font-mono break-all">{log}</div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
