
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePrivy, useWallets, useSignTypedData } from '@privy-io/react-auth';
import { Market, TradingPair } from '@/types/market-data';
import { parseUnits, getAddress, isAddress, formatUnits } from 'viem';
import { OrderConfirmationDialog } from './OrderConfirmationDialog';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrder, CreateOrderRequest } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBalance } from '@/lib/format';
import { useVault } from '@/contexts/VaultContext';
import { INTENT_SPOT_ROUTER_ADDRESS } from '@/config/contracts';
import { toast } from 'sonner';
import { AgentLog } from './AgentLog';
import { useAgentStatus } from '@/hooks/useAgentStatus';
import { serialize } from '@/lib/serializers';
import { usePublicClient } from 'wagmi';
import { IntentSpotRouterAbi } from '@/config/IntentSpotRouter';
import { useCorrectNonce } from '@/hooks/useCorrectNonce';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const chainId = 84532; // Base Sepolia

// EIP-712 Domain
const domain = {
  name: 'IntentSpotRouter',
  version: '1.0',
  chainId: chainId,
  verifyingContract: getAddress(INTENT_SPOT_ROUTER_ADDRESS[chainId]),
};

// EIP-712 Types for the intent
const types = {
  SwapIntent: [
    { name: 'user', type: 'address' },
    { name: 'tokenIn', type: 'address' },
    { name: 'tokenOut', type: 'address' },
    { name: 'amountIn', type: 'uint256' },
    { name: 'minAmountOut', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'adapter', type: 'address' },
    { name: 'relayerFee', type: 'uint256' },
  ],
};

// Helper function to safely parse units
const safeParseUnits = (value: string, decimals: number) => {
  if (!value || isNaN(Number(value))) {
    throw new Error("Invalid numeric value");
  }
  return parseUnits(value, decimals);
};

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
  const [total, setTotal] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  
  const { ready, authenticated, user, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getVaultBalance, isLoading: isVaultLoading } = useVault();
  const { signTypedData } = useSignTypedData();
  const { logs: agentLogs, addLog, clearLogs } = useAgentStatus();
  const publicClient = usePublicClient();
  const { getNonce } = useCorrectNonce();

  const connectedWallet = wallets[0];
  const currentPrice = market?.lastPrice || '0';

  useEffect(() => {
    if (orderType === 'limit') {
      setPrice(currentPrice);
    }
  }, [currentPrice, orderType]);

  const baseToken = pair?.base;
  const quoteToken = pair?.quote;
  const displayBaseSymbol = baseToken ? (baseToken.symbol === 'WETH' ? 'ETH' : baseToken.symbol) : '';
  const displayQuoteSymbol = quoteToken ? (quoteToken.symbol === 'WETH' ? 'ETH' : quoteToken.symbol) : '';

  const baseBalance = baseToken ? getVaultBalance(baseToken.address) : 0n;
  const quoteBalance = quoteToken ? getVaultBalance(quoteToken.address) : 0n;

  const calculatedTotal = useMemo(() => {
    const numericAmount = parseFloat(amount);
    const numericPrice = parseFloat(orderType === 'limit' ? price : currentPrice);
    if (isNaN(numericAmount) || isNaN(numericPrice) || numericPrice === 0) {
        return '';
    }
    return (numericAmount * numericPrice).toFixed(4);
  }, [amount, price, currentPrice, orderType]);

  const handleAmountChange = (newAmount: string) => {
    setAmount(newAmount);
    const numericAmount = parseFloat(newAmount);
    const numericPrice = parseFloat(orderType === 'limit' ? price : currentPrice);
    if (!isNaN(numericAmount) && !isNaN(numericPrice) && numericPrice > 0) {
        setTotal((numericAmount * numericPrice).toFixed(4));
    }
  };

  const handleTotalChange = (newTotal: string) => {
    setTotal(newTotal);
    const numericTotal = parseFloat(newTotal);
    const numericPrice = parseFloat(orderType === 'limit' ? price : currentPrice);
    if (!isNaN(numericTotal) && !isNaN(numericPrice) && numericPrice > 0) {
        setAmount((numericTotal / numericPrice).toFixed(baseToken?.decimals || 18));
    }
  };

  const hasSufficientBalance = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return true;
    const totalToCompare = parseFloat(total);

    if (side === 'buy') {
      if (!quoteToken || isNaN(totalToCompare)) return false;
      const totalAmount = parseUnits(totalToCompare.toString(), quoteToken.decimals);
      return quoteBalance >= totalAmount;
    } else {
      if (!baseToken) return false;
      const orderAmount = parseUnits(amount, baseToken.decimals);
      return baseBalance >= orderAmount;
    }
  }, [amount, total, side, baseBalance, quoteBalance, baseToken, quoteToken]);

  const { mutate: submitOrder, isPending: isSubmitting } = useMutation({
    mutationFn: async (order: CreateOrderRequest) => {
        const accessToken = await getAccessToken();
        return createOrder(order, accessToken || '');
    },
    onMutate: () => {
      addLog('Submitting order to backend...');
    },
    onSuccess: (data) => {
      addLog('Order successfully received by backend.');
      toast.success('Order placed successfully!');
      setIsConfirming(false);
      setAmount('');
      setTotal('');
      queryClient.invalidateQueries({ queryKey: ['vaultTokens'] });
      queryClient.invalidateQueries({ queryKey: ['orders', user?.wallet?.address] });
      queryClient.invalidateQueries({ queryKey: ['tradeHistory', user?.wallet?.address] });
    },
    onError: (error: Error) => {
      addLog(`Backend failed to accept order: ${error.message}. See console for details.`, 'error');
      toast.error(error.message);
      console.error('Failed to create order:', error);
      setIsConfirming(false);
    }
  });

  const handlePlaceOrder = () => {
    if (!authenticated) {
      login();
      return;
    }
    if (!hasSufficientBalance) {
      toast.error('Insufficient funds');
      return;
    }
    clearLogs();
    setIsConfirming(true);
  };

  const handleConfirmOrder = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        toast.error("Invalid amount");
        return;
    }

    if (orderType === 'limit' && (!price || isNaN(Number(price)))) {
        toast.error("Invalid price");
        return;
    }

    if (!currentPrice || isNaN(Number(currentPrice)) || Number(currentPrice) <= 0) {
        toast.error("Invalid market price. Cannot execute trade.");
        return;
    }

    if (!user?.wallet?.address || !baseToken || !quoteToken || !connectedWallet) {
        toast.error("Wallet not connected or tokens not defined.");
        return;
    }

    const userAddress = user.wallet.address;
    if (!isAddress(userAddress)) {
        const errorMsg = `Invalid wallet address before signing: ${userAddress}`;
        addLog(errorMsg, 'error');
        console.error(errorMsg);
        toast.error("Invalid wallet address detected. Please reconnect your wallet.");
        setIsConfirming(false);
        return;
    }

    const isBuy = side === 'buy';
    const tokenIn = isBuy ? quoteToken : baseToken;
    const tokenOut = isBuy ? baseToken : quoteToken;
    
    const finalTotal = parseFloat(total);
    if (isNaN(finalTotal)) {
      toast.error("Invalid total amount");
      return;
    }

    const amountIn = isBuy ? safeParseUnits(finalTotal.toString(), tokenIn.decimals) : safeParseUnits(amount, tokenIn.decimals);
    
    let expectedAmountOut: bigint;

    if (isBuy) {
        // BUY: quote -> base (e.g. USDC -> WETH)
        const amountInFloat = finalTotal; // Total is in quote currency
        const priceFloat = parseFloat(currentPrice);
        if (priceFloat === 0) {
            toast.error("Cannot execute trade with a price of zero.");
            setIsConfirming(false);
            return;
        }
        const out = amountInFloat / priceFloat;
        expectedAmountOut = parseUnits(out.toFixed(tokenOut.decimals), tokenOut.decimals);
    } else {
        // SELL: base -> quote (e.g. WETH -> USDC)
        const amountInFloat = parseFloat(amount); // Amount is in base currency
        const priceFloat = parseFloat(currentPrice);
        const out = amountInFloat * priceFloat;
        expectedAmountOut = parseUnits(out.toFixed(tokenOut.decimals), tokenOut.decimals);
    }

    // Apply 2% slippage tolerance
    const minAmountOut = expectedAmountOut * 98n / 100n;

    const nonce = await getNonce();

    const intent = {
        user: userAddress,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: amountIn.toString(),
        minAmountOut: minAmountOut.toString(),
        deadline: (Math.floor(Date.now() / 1000) + 300).toString(),
        nonce: nonce,
        adapter: '0x0000000000000000000000000000000000000000',
        relayerFee: "0"
    };

    addLog('Awaiting signature for trade intent...');

    try {
      const result:any = await signTypedData({
        domain: domain,
        types,
        primaryType: "SwapIntent",
        message: intent,
      });
      
      let signature: string;

      if (typeof result === "string") {
        signature = result;
      } else if (result?.signature) {
        signature = result.signature;
      } else if (result?.r && result?.s && result?.v) {
        signature = `${result.r}${result.s.slice(2)}${result.v.toString(16)}`;
      } else {
        throw new Error("Invalid signature format");
      }

      addLog(`Signature received: ${signature.slice(0,10)}...`);

      const rawOrder: CreateOrderRequest = {
        intent: intent as CreateOrderRequest['intent'],
        signature,
        orderType,
        side,
        tradingPairId: pair.id,
        quantity: amount,
        price: orderType === 'limit' ? price : null,
      };

      submitOrder(rawOrder);

    } catch (e) {
        const error = e as Error;
        addLog(`Signing failed: ${error.message}`, 'error');
        console.error("Signing error:", error);
        toast.error(`Signing failed: ${error.message}`);
        setIsConfirming(false);
    }
  };

  const handlePercentage = (percentage: number) => {
    const balance = side === 'buy' ? quoteBalance : baseBalance;
    const decimals = side === 'buy' ? quoteToken?.decimals : baseToken?.decimals;
    if (!balance || decimals === undefined) return;
  
    const percentageBigInt = BigInt(Math.floor(percentage * 100));
    const HUNDRED = 100n;
    const newAmountWei = (balance * percentageBigInt) / HUNDRED;
  
    if (side === 'buy') {
      if (currentPrice && parseFloat(currentPrice) > 0) {
        const amountInQuote = formatUnits(newAmountWei, decimals);
        handleTotalChange(amountInQuote);
      }
    } else {
      handleAmountChange(formatUnits(newAmountWei, decimals));
    }
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
        availableBalance: formatBalance(quoteBalance, quoteToken?.decimals),
        availableSymbol: displayQuoteSymbol
      };
    } else { // sell
      return {
        availableBalance: formatBalance(baseBalance, baseToken?.decimals),
        availableSymbol: displayBaseSymbol
      };
    }
  }, [side, baseBalance, quoteBalance, displayBaseSymbol, displayQuoteSymbol, baseToken, quoteToken]);

  if (isVaultLoading) {
    return <SkeletonTradePanel />;
  }

  // Mobile view is simplified and does not include the total input field for now.
  if (isMobile) {
    return (
      <div className="p-2 bg-background h-full flex flex-col text-xs">
        <ToggleGroup type="single" value={side} onValueChange={(value: 'buy' | 'sell') => { if (value) setSide(value); }} className="w-full mb-2 grid grid-cols-2">
          <ToggleGroupItem value="buy" className="data-[state=on]:bg-green-500/20 data-[state=on]:text-green-500">
            Buy
          </ToggleGroupItem>
          <ToggleGroupItem value="sell" className="data-[state=on]:bg-red-500/20 data-[state=on]:text-red-500">
            Sell
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="mb-2">
          <div className="flex space-x-2">
            <Button onClick={() => setOrderType('market')} variant={orderType === 'market' ? 'default' : 'outline'} size="xs" className="w-full">Market</Button>
            <Button onClick={() => setOrderType('limit')} variant={orderType === 'limit' ? 'default' : 'outline'} size="xs" className="w-full">Limit</Button>
          </div>
        </div>

        {orderType === 'limit' && (
          <div className="mb-2">
            <Label htmlFor="price" className="text-xs text-muted-foreground">Price</Label>
            <Input
              id="price-mobile"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1"
              placeholder={`${displayQuoteSymbol}`}
            />
          </div>
        )}

        <div className="mb-2">
          <Label htmlFor="amount-mobile" className="text-xs text-muted-foreground">Amount</Label>
          <Input
            id="amount-mobile"
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="mt-1"
            placeholder={`${displayBaseSymbol}`}
          />
        </div>
        
        <div className="mb-2 p-2 bg-muted rounded-md flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-xs font-mono">{calculatedTotal} {displayQuoteSymbol}</span>
        </div>
        
        <div className="text-xs text-muted-foreground mb-2">
          Available: {availableBalance} {availableSymbol}
        </div>

        <div className="flex-grow"></div>

        <Button
          className={cn("w-full text-sm p-4", side === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600', { 'animate-pulse': isSubmitting })}
          onClick={handlePlaceOrder}
          disabled={disabled || isSubmitting || !ready || (authenticated && !connectedWallet) || !hasSufficientBalance}
        >
          {getButtonText()}
        </Button>
      </div>
    )
  }

  return (
    <Card className="h-full bg-card text-sm">
      <CardContent className="p-4">
        <h3 className="text-base font-semibold mb-4">Trade</h3>
        <ToggleGroup type="single" value={side} onValueChange={(value: 'buy' | 'sell') => { if (value) setSide(value); }} className="w-full mb-4 grid grid-cols-2">
          <ToggleGroupItem value="buy" aria-label="Buy" className="data-[state=on]:bg-green-500/20 data-[state=on]:text-green-500">
            <p className="text-sm">Buy</p>
          </ToggleGroupItem>
          <ToggleGroupItem value="sell" aria-label="Sell" className="data-[state=on]:bg-red-500/20 data-[state=on]:text-red-500">
            <p className="text-sm">Sell</p>
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="mb-4 flex space-x-2">
          <Button onClick={() => setOrderType('market')} variant={orderType === 'market' ? 'secondary' : 'ghost'} className="w-full text-sm">Market</Button>
          <Button onClick={() => setOrderType('limit')} variant={orderType === 'limit' ? 'secondary' : 'ghost'} className="w-full text-sm">Limit</Button>
        </div>

        {orderType === 'limit' && (
          <div className="mb-4 space-y-2">
            <Label htmlFor="price" className="text-xs">Price</Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={`Price (${displayQuoteSymbol})`} className="text-sm" />
          </div>
        )}

        <div className="mb-4 space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="amount" className="text-xs">Amount</Label>
            <span className="text-xs text-muted-foreground">Available: {availableBalance} {availableSymbol}</span>
          </div>
          <Input id="amount" type="number" value={amount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="0.00" className="text-sm" />
          <div className="flex justify-between mt-2 space-x-1">
            <Button size="sm" variant="outline" onClick={() => handlePercentage(0.25)} className="flex-1 text-xs px-2 py-1 h-auto">25%</Button>
            <Button size="sm" variant="outline" onClick={() => handlePercentage(0.50)} className="flex-1 text-xs px-2 py-1 h-auto">50%</Button>
            <Button size="sm" variant="outline" onClick={() => handlePercentage(0.75)} className="flex-1 text-xs px-2 py-1 h-auto">75%</Button>
            <Button size="sm" variant="outline" onClick={() => handlePercentage(1)} className="flex-1 text-xs px-2 py-1 h-auto">100%</Button>
          </div>
        </div>
        
        <Separator className="my-4" />

        <div className="mb-4 space-y-2">
            <Label htmlFor="total" className="text-xs text-muted-foreground">Total</Label>
            <Input id="total" type="number" value={total} onChange={(e) => handleTotalChange(e.target.value)} placeholder={calculatedTotal || `Total (${displayQuoteSymbol})`} className="text-sm" />
        </div>
        
        <Button
          onClick={handlePlaceOrder}
          className={cn("w-full text-base py-5", side === 'buy' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white', { 'animate-pulse': isSubmitting })}
          disabled={disabled ||
            isSubmitting ||
            !ready ||
            (authenticated && !connectedWallet) ||
            !hasSufficientBalance ||
            !amount ||
            Number(amount) <= 0 ||
            (orderType === 'limit' && (!price || Number(price) <= 0))}
        >
          {getButtonText()}
        </Button>
      </CardContent>
      
      <div className="p-4 border-t">
        <AgentLog logs={agentLogs} clearLogs={clearLogs} />
      </div>

      <OrderConfirmationDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        onConfirm={handleConfirmOrder}
        order={{
          side,
          amount,
          symbol: pair.base ? pair.base.symbol : '',
          price,
          orderType,
          total: parseFloat(total) || 0
        }}
      />
    </Card>
  );
}
