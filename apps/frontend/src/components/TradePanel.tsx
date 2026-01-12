
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePrivy } from '@privy-io/react-auth';
import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { useSubmitIntent } from '@/hooks/useSubmitIntent';
import { useVaultBalance } from '@/hooks/useVaultBalance';
import { useTrackedTx } from '@/hooks/useTrackedTx';
import { TOKENS, VAULT_SPOT_ADDRESS, Token } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import { toast } from 'sonner';
import { OrderConfirmationDialog } from './OrderConfirmationDialog';

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
  const [isConfirming, setIsConfirming] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { ready, authenticated } = usePrivy();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const submitIntent = useSubmitIntent();

  const baseCurrency = symbol.replace('USDT', '') as Token;
  const quoteCurrency = 'USDT' as Token;

  const baseToken = TOKENS[baseCurrency];
  const quoteToken = TOKENS[quoteCurrency];

  const { data: baseBalance } = useVaultBalance(baseToken?.address);
  const { data: quoteBalance, refetch: refetchQuoteBalance } = useVaultBalance(quoteToken?.address);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: quoteToken.address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, VAULT_SPOT_ADDRESS] : undefined,
    query: {
      enabled: !!address && !!quoteToken,
    }
  });

  useTrackedTx({
    hash: txHash,
    onSuccess: () => {
      refetchAllowance();
      refetchQuoteBalance();
    }
  });

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
      const needsApproval = allowance === undefined || allowance < parsedAmount;

      if (needsApproval) {
        const approvalHash = await writeContractAsync({
          address: quoteToken.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [VAULT_SPOT_ADDRESS, parsedAmount]
        });
        setTxHash(approvalHash);
      }

      const depositHash = await writeContractAsync({
        address: VAULT_SPOT_ADDRESS,
        abi: VaultSpotAbi,
        functionName: 'deposit',
        args: [quoteToken.address, parsedAmount]
      });
      setTxHash(depositHash);
    } catch (err) {
      toast.error('Deposit failed.');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !quoteToken) return;
    try {
      const parsedAmount = parseUnits(withdrawAmount, quoteToken.decimals);
      const hash = await writeContractAsync({
        address: VAULT_SPOT_ADDRESS,
        abi: VaultSpotAbi,
        functionName: 'withdraw',
        args: [quoteToken.address, parsedAmount]
      });
      setTxHash(hash);
    } catch (err) {
      toast.error('Withdrawal failed.');
    }
  };

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
          onClick={handlePlaceOrder}
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
            <Button onClick={handleDeposit} className="ml-2" >Deposit</Button>
          </div>
          <div className="flex items-center mt-2">
            <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Withdraw USDT" />
            <Button onClick={handleWithdraw} className="ml-2" >Withdraw</Button>
          </div>
        </div>
      </CardContent>

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
    </Card>
  );
}
