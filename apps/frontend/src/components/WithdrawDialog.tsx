import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Token;
}

export function WithdrawDialog({ open, onOpenChange, asset }: WithdrawDialogProps) {
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawTxHash, setWithdrawTxHash] = useState<`0x${string}` | undefined>();

  useEffect(() => {
    setAmount('');
  }, [open, asset]);

  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const token = TOKENS[asset];

  useTrackedTx({
    hash: withdrawTxHash,
    onSuccess: () => {
      onOpenChange(false);
      toast.success("Withdrawal successful!");
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-withdraw">
        <DialogHeader>
          <DialogTitle>Withdraw {asset}</DialogTitle>
          <DialogDescription>
            Enter the amount of {asset} you want to withdraw.
          </DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}
