
import { useState } from 'react';
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
import { TOKENS, VAULT_SPOT_ADDRESS, Token } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { parseUnits } from 'viem';
import { useWriteContract } from 'wagmi';

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Token;
}

export function WithdrawDialog({ open, onOpenChange, asset }: WithdrawDialogProps) {
  const [amount, setAmount] = useState('');
  const { writeContractAsync, isPending } = useWriteContract();
  const token = TOKENS[asset];

  const handleWithdraw = async () => {
    if (!amount || !token) return;

    try {
      const parsedAmount = parseUnits(amount, token.decimals);
      await writeContractAsync({
        address: VAULT_SPOT_ADDRESS,
        abi: VaultSpotAbi,
        functionName: 'withdraw',
        args: [token.address, parsedAmount]
      });
      toast.success('Withdrawal successful!');
      setAmount('');
      onOpenChange(false);
    } catch (err) {
      toast.error('Withdrawal failed.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-withdraw">
        <DialogHeader>
          <DialogTitle>Withdraw {asset}</DialogTitle>
          <DialogDescription>
            Withdraw {asset} from your balance
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
            />
          </div>

          <Button
            onClick={handleWithdraw}
            disabled={!amount || isPending}
            className="w-full"
            variant="destructive"
            data-testid="button-confirm-withdraw"
          >
            {isPending ? 'Processing...' : 'Confirm Withdrawal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
