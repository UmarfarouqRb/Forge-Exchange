
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { VAULT_SPOT_ADDRESS, WETH_ADDRESS } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { WethAbi } from '@/abis/Weth';
import { parseUnits } from 'viem';
import { useWallets } from '@privy-io/react-auth';
import { useTrackedTx } from '@/hooks/useTrackedTx';
import { wagmiConfig } from '@/wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { FiLoader } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVault } from '@/contexts/VaultContext';
import { VaultAssetSelector } from '@/components/VaultAssetSelector';
import { useTransaction } from '@/hooks/useTransaction';
import { useVaultBalance } from '@/hooks/useVaultBalance';
import { Token } from '@/types/market-data';
import { TransactionError } from '@/types/errors';

export default function Withdraw() {
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawTxHash, setWithdrawTxHash] = useState<`0x${string}` | undefined>();
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string | ''>('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const assetSymbolFromUrl = params.get('asset');

  const { tokens: allTokens } = useVault();
  const { writeContractAsync } = useTransaction();

  useEffect(() => {
    if (assetSymbolFromUrl) {
      setSelectedAssetSymbol(assetSymbolFromUrl);
    }
}, [assetSymbolFromUrl]);

  const { wallets } = useWallets();
  const connectedWallet = wallets[0];

  const selectedToken = allTokens.find(t => t.symbol === selectedAssetSymbol);
  const { data: vaultBalance, refetch: refetchVaultBalance } = useVaultBalance(selectedToken?.address as `0x${string}` | undefined);

  useTrackedTx({
    hash: withdrawTxHash,
    onSuccess: () => {
      refetchVaultBalance();
      setMessage({ type: 'success', text: 'Withdrawal successful! Your balance will update shortly.' });
      toast.success('Withdrawal successful!');
      setIsWithdrawing(false);
    }
  });

  const handleEthWithdraw = async (parsedAmount: bigint) => {
    const toastId = toast.loading('Initiating ETH withdrawal...');
    try {
      toast.loading('Step 1/2: Withdrawing WETH from vault...', { id: toastId });
      const withdrawHash = await writeContractAsync({
          address: VAULT_SPOT_ADDRESS,
          abi: VaultSpotAbi,
          functionName: 'withdraw',
          args: [WETH_ADDRESS as `0x${string}`, parsedAmount],
        });
      await waitForTransactionReceipt(wagmiConfig, { hash: withdrawHash });
      toast.success('Step 1/2: WETH withdrawn successfully!');

      toast.loading('Step 2/2: Unwrapping WETH to ETH...', { id: toastId });
      const unwrapHash = await writeContractAsync({
          address: WETH_ADDRESS as `0x${string}`,
          abi: WethAbi,
          functionName: 'withdraw',
          args: [parsedAmount],
      });
      setWithdrawTxHash(unwrapHash);
    } catch (err: unknown) {
        const errorMsg = (err as TransactionError).shortMessage || 'An error occurred during the ETH withdrawal.';
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg, { id: toastId });
        setIsWithdrawing(false);
    }
  }

  const handleErc20Withdraw = async (parsedAmount: bigint, token: Token) => {
    const toastId = toast.loading(`Initiating ${token.symbol} withdrawal...`);
    try {
      toast.loading(`Withdrawing ${token.symbol}...`, { id: toastId });
      const withdrawHash = await writeContractAsync({
        address: VAULT_SPOT_ADDRESS,
        abi: VaultSpotAbi,
        functionName: 'withdraw',
        args: [token.address as `0x${string}`, parsedAmount]
      });
      setWithdrawTxHash(withdrawHash);
    } catch (err: unknown) {
        const errorMsg = (err as TransactionError).shortMessage || `An error occurred during the ${token.symbol} withdrawal.`;
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg, { id: toastId });
        setIsWithdrawing(false);
    }
  }

  const handleWithdraw = async () => {
    setMessage(null);
    if (!connectedWallet) {
      setMessage({ type: 'error', text: 'Please connect your wallet first.' });
      toast.error('Please connect your wallet first.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
        setMessage({ type: 'error', text: 'Please enter a valid amount.' });
        toast.error('Please enter a valid amount.');
        return;
    }
    if (!selectedToken) {
        setMessage({ type: 'error', text: 'Please select a valid asset to withdraw.' });
        toast.error('Please select a valid asset to withdraw.');
        return;
    }

    const parsedAmount = parseUnits(amount, selectedToken.decimals);
    
    if (vaultBalance && vaultBalance < parsedAmount) {
        setMessage({ type: 'error', text: 'Insufficient vault balance for this withdrawal.' });
        toast.error('Insufficient vault balance for this withdrawal.');
        return;
    }

    setIsWithdrawing(true);
    setAmount('');

    if (selectedAssetSymbol === 'ETH') {
      handleEthWithdraw(parsedAmount);
    } else {
      handleErc20Withdraw(parsedAmount, selectedToken);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Withdraw</CardTitle>
            </CardHeader>
            <CardContent>
                {message && (
                    <div className={`p-4 rounded-md my-4 ${message.type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-green-100 border border-green-400 text-green-700'}`}>
                        <p>{message.text}</p>
                    </div>
                )}
                <div className="space-y-4 py-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="asset-selector" className="mb-2">Select Asset</Label>
                        <VaultAssetSelector 
                            asset={selectedAssetSymbol}
                            setAsset={setSelectedAssetSymbol} 
                            type="withdraw"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="withdraw-amount">Amount</Label>
                        <Input
                        id="withdraw-amount"
                        type="number"
                        placeholder={`0.00`}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isWithdrawing || !selectedAssetSymbol}
                        />
                    </div>

                    <Button
                        onClick={handleWithdraw}
                        disabled={!amount || isWithdrawing || !selectedAssetSymbol}
                        className="w-full"
                        variant="destructive"
                        data-testid="button-confirm-withdraw"
                    >
                        {isWithdrawing ? (
                        <>
                            <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                        ) : (
                        'Confirm Withdrawal'
                        )}
                    </Button>
                    <Button onClick={() => navigate('/assets')} className="w-full mt-2" variant="outline">
                        Back to Assets
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
