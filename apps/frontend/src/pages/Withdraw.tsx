import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { TOKENS, VAULT_SPOT_ADDRESS, Token, WETH_ADDRESS } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { WethAbi } from '@/abis/Weth';
import { parseUnits } from 'viem';
import { useWriteContract, useAccount, useWalletClient } from 'wagmi';
import { useTrackedTx } from '@/hooks/useTrackedTx';
import { wagmiConfig } from '@/wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { FiLoader } from 'react-icons/fi';
import { NewAssetSelector } from '@/components/NewAssetSelector';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Withdraw() {
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawTxHash, setWithdrawTxHash] = useState<`0x${string}` | undefined>();
  const [selectedAsset, setSelectedAsset] = useState<Token | ''>('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const asset = params.get('asset') as Token;

  useEffect(() => {
    setSelectedAsset(asset || '');
  }, [asset]);

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const token = selectedAsset ? TOKENS[selectedAsset] : undefined;

  useTrackedTx({
    hash: withdrawTxHash,
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Withdrawal successful! Your balance will update shortly.' });
      toast.success("Withdrawal successful!");
    }
  });

  const handleWithdraw = async () => {
    setMessage(null);
    if (!isConnected || !walletClient || !address) {
      const errorMessage = 'Please connect your wallet first.';
      setMessage({ type: 'error', text: errorMessage });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
        const errorMessage = 'Please enter a valid amount.';
        setMessage({ type: 'error', text: errorMessage });
        return;
    }
    if (!token || !selectedAsset) {
        const errorMessage = 'Please select a valid asset to withdraw.';
        setMessage({ type: 'error', text: errorMessage });
        return;
    }

    setIsWithdrawing(true);
    const toastId = toast.loading("Initiating withdrawal...");

    try {
      const parsedAmount = parseUnits(amount, token.decimals);

      if (selectedAsset === 'ETH') {
        toast.loading("Step 1/2: Withdrawing WETH from vault...", { id: toastId });
        const withdrawWethHash = await writeContractAsync({
            address: VAULT_SPOT_ADDRESS,
            abi: VaultSpotAbi,
            functionName: 'withdraw',
            args: [WETH_ADDRESS, parsedAmount]
        });

        toast.loading(`Step 1/2: Waiting for vault withdrawal... (tx: ${withdrawWethHash.substring(0, 10)}...)`, { id: toastId });
        await waitForTransactionReceipt(wagmiConfig, { hash: withdrawWethHash });
        toast.success("Vault withdrawal successful!", { id: toastId });

        toast.loading("Step 2/2: Unwrapping WETH to ETH...", { id: toastId });
        const unwrapHash = await writeContractAsync({
            address: WETH_ADDRESS,
            abi: WethAbi,
            functionName: 'withdraw',
            args: [parsedAmount]
        });

        toast.loading(`Step 2/2: Waiting for unwrap transaction... (tx: ${unwrapHash.substring(0, 10)}...)`, { id: toastId });
        setWithdrawTxHash(unwrapHash);
      } else {
        toast.loading("Withdrawing asset from vault...", { id: toastId });
        const withdrawHash = await writeContractAsync({
          address: VAULT_SPOT_ADDRESS,
          abi: VaultSpotAbi,
          functionName: 'withdraw',
          args: [token.address, parsedAmount]
        });
        toast.loading(`Waiting for withdrawal transaction... (tx: ${withdrawHash.substring(0, 10)}...)`, { id: toastId });
        setWithdrawTxHash(withdrawHash);
      }
      
      setAmount('');
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = "An error occurred during the withdrawal.";
      if (err && typeof err === 'object' && 'shortMessage' in err) {
        errorMessage = String(err.shortMessage) || errorMessage;
      }
      setMessage({ type: 'error', text: errorMessage });
      toast.error(errorMessage, { id: toastId });
      setIsWithdrawing(false);
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
                    <div className="space-y-2">
                        <Label htmlFor="asset-selector">Select Asset</Label>
                        <NewAssetSelector asset={selectedAsset} setAsset={setSelectedAsset} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="withdraw-amount">Amount</Label>
                        <Input
                        id="withdraw-amount"
                        type="number"
                        placeholder={`0.00`}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isWithdrawing || !selectedAsset}
                        />
                    </div>

                    <Button
                        onClick={handleWithdraw}
                        disabled={!amount || isWithdrawing || !selectedAsset}
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
                    {message?.type === 'success' && (
                        <Button onClick={() => navigate('/assets')} className="w-full mt-2" variant="outline">
                            Back to Assets
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
