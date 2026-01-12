
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
import { parseUnits, erc20Abi } from 'viem';
import { useWriteContract } from 'wagmi';

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Token;
}

export function DepositDialog({ open, onOpenChange, asset }: DepositDialogProps) {
  const [amount, setAmount] = useState('');
  const { writeContractAsync, isPending } = useWriteContract();
  const token = TOKENS[asset];

  const handleDeposit = async () => {
    if (!amount || !token) return;

    try {
      const parsedAmount = parseUnits(amount, token.decimals);
      await writeContractAsync({
        address: token.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [VAULT_SPOT_ADDRESS, parsedAmount]
      });
      await writeContractAsync({
        address: VAULT_SPOT_ADDRESS,
        abi: VaultSpotAbi,
        functionName: 'deposit',
        args: [token.address, parsedAmount]
      });
      toast.success('Deposit successful!');
      setAmount('');
      onOpenChange(false);
    } catch (err) {
      toast.error('Deposit failed.');
    } 
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-deposit">
        <DialogHeader>
          <DialogTitle>Deposit {asset}</DialogTitle>
          <DialogDescription>
            Add funds to your {asset} balance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deposit-amount">Amount</Label>
            <Input
              id="deposit-amount"
              type="number"
              placeholder={`0.00`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <Button
            onClick={handleDeposit}
            disabled={!amount || isPending}
            className="w-full"
            data-testid="button-confirm-deposit"
          >
            {isPending ? 'Processing...' : 'Confirm Deposit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
