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
import { useLocation, useNavigate } from 'react-router-dom';

export default function Withdraw() {
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawTxHash, setWithdrawTxHash] = useState<`0x${string}` | undefined>();

  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const asset = params.get('asset') as Token;

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const token = TOKENS[asset];

  useTrackedTx({
    hash: withdrawTxHash,
    onSuccess: () => {
      toast.success("Withdrawal successful!");
      navigate('/assets');
    }
  });

  const handleWithdraw = async () => {
    if (!isConnected || !walletClient || !address) {
      toast.error("Please connect your wallet first.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
        toast.error("Please enter a valid amount.");
        return;
    }
    if (!token) {
        toast.error("Selected asset is not valid.");
        return;
    }

    setIsWithdrawing(true);
    const toastId = toast.loading("Initiating withdrawal...");

    try {
      const parsedAmount = parseUnits(amount, token.decimals);

      if (asset === 'ETH') {
        toast.loading("Withdrawing WETH from vault...", { id: toastId });
        const withdrawWethHash = await writeContractAsync({
            address: VAULT_SPOT_ADDRESS,
            abi: VaultSpotAbi,
            functionName: 'withdraw',
            args: [WETH_ADDRESS, parsedAmount]
        });

        toast.loading("Waiting for vault withdrawal to complete...", { id: toastId });
        await waitForTransactionReceipt(wagmiConfig, { hash: withdrawWethHash });
        toast.success("Vault withdrawal successful! Now unwrapping to ETH.", { id: toastId });

        toast.loading("Unwrapping WETH to ETH...", { id: toastId });
        const unwrapHash = await writeContractAsync({
            address: WETH_ADDRESS,
            abi: WethAbi,
            functionName: 'withdraw',
            args: [parsedAmount]
        });

        setWithdrawTxHash(unwrapHash);
      } else {
        toast.loading("Withdrawing asset from vault...", { id: toastId });
        const withdrawHash = await writeContractAsync({
          address: VAULT_SPOT_ADDRESS,
          abi: VaultSpotAbi,
          functionName: 'withdraw',
          args: [token.address, parsedAmount]
        });
        setWithdrawTxHash(withdrawHash);
      }
      
      setAmount('');
    } catch (err: unknown) {
      console.error(err);
      let message = "An error occurred during the withdrawal.";
      if (err && typeof err === 'object' && 'shortMessage' in err) {
        message = String(err.shortMessage) || message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      toast.error(message, { id: toastId });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Withdraw {asset}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">Amount</Label>
                    <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder={`0.00`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isWithdrawing}
                    />
                </div>

                <Button
                    onClick={handleWithdraw}
                    disabled={!amount || isWithdrawing}
                    className="w-full"
                    variant="destructive"
                    data-testid="button-confirm-withdraw"
                >
                    {isWithdrawing ? (
                    <>
                        <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                        Withdrawing...
                    </>
                    ) : (
                    'Confirm Withdrawal'
                    )}
                </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
