
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePrivy } from '@privy-io/react-auth';
import { useWriteContract } from 'wagmi';
import { useSubmitIntent } from '@/hooks/useSubmitIntent';
import { useVaultBalance } from '@/hooks/useVaultBalance';
import { TOKENS, VAULT_SPOT_ADDRESS, Token } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import { toast } from 'sonner';

interface TradePanelProps {
  symbol: string;
  currentPrice: string;
  disabled?: boolean;
}

export function TradePanel({ symbol, currentPrice, disabled = false }: TradePanelProps) {
  const [orderType, setOrderType] = useState<'limit' | 'market'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState(currentPrice);
  const [amount, setAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [slippage, setSlippage] = useState('0.05');
  const { ready, authenticated } = usePrivy();
  const { writeContractAsync, isPending } = useWriteContract();
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

  const handleDeposit = async () => {
    if (!depositAmount || !quoteToken) return;
    try {
      const parsedAmount = parseUnits(depositAmount, quoteToken.decimals);
      await writeContractAsync({
        address: quoteToken.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [VAULT_SPOT_ADDRESS, parsedAmount]
      });
      await writeContractAsync({
        address: VAULT_SPOT_ADDRESS,
        abi: VaultSpotAbi,
        functionName: 'deposit',
        args: [quoteToken.address, parsedAmount]
      });
      toast.success('Deposit successful!');
    } catch (err) {
      toast.error('Deposit failed.');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !quoteToken) return;
    try {
      const parsedAmount = parseUnits(withdrawAmount, quoteToken.decimals);
      await writeContractAsync({
        address: VAULT_SPOT_ADDRESS,
        abi: VaultSpotAbi,
        functionName: 'withdraw',
        args: [quoteToken.address, parsedAmount]
      });
      toast.success('Withdrawal successful!');
    } catch (err) {
      toast.error('Withdrawal failed.');
    }
  };

  const handleSubmit = async () => {
    if (!authenticated || !hasSufficientBalance) {
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

  const getButtonText = () => {
    if (disabled) return 'Disabled';
    if (!ready || !authenticated) return 'Wallet Not Connected';
    if (!hasSufficientBalance) return 'Insufficient Funds';
    return 'Place Order';
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4">
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
          onClick={handleSubmit}
          disabled={disabled || submitIntent.isPending || !ready || !authenticated || !hasSufficientBalance}
        >
          {getButtonText()}
        </Button>

        <div className="mt-8">
          <h3 className="text-lg font-semibold">Vault</h3>
          <div className="mt-4">
            <Label>USDT Balance: {quoteBalance ? formatUnits(quoteBalance, quoteToken.decimals) : '0'}</Label>
          </div>
          <div className="flex items-center mt-2">
            <Input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="Deposit USDT" />
            <Button onClick={handleDeposit} className="ml-2" disabled={isPending}>Deposit</Button>
          </div>
          <div className="flex items-center mt-2">
            <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Withdraw USDT" />
            <Button onClick={handleWithdraw} className="ml-2" disabled={isPending}>Withdraw</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
