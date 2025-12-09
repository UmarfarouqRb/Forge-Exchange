import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { FiAlertCircle } from 'react-icons/fi';

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: string;
  walletAddress: string;
  available: number;
}

const MINIMUM_WITHDRAWAL = 10;
const WITHDRAWAL_FEE = 0.1;

export function WithdrawDialog({ open, onOpenChange, asset, walletAddress, available }: WithdrawDialogProps) {
  const [amount, setAmount] = useState('');
  const { toast } = useToast();

  const withdrawMutation = useMutation({
    mutationFn: async (withdrawAmount: number) => {
      return apiRequest('/api/transactions/withdraw', 'POST', {
        walletAddress,
        asset,
        amount: withdrawAmount.toString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets', walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', walletAddress] });
      toast({
        title: 'Withdrawal Successful',
        description: `${amount} ${asset} has been withdrawn from your account.`,
      });
      setAmount('');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Withdrawal Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleWithdraw = () => {
    const withdrawAmount = parseFloat(amount);
    
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (withdrawAmount < MINIMUM_WITHDRAWAL) {
      toast({
        title: 'Minimum Withdrawal Required',
        description: `The minimum withdrawal amount is $${MINIMUM_WITHDRAWAL}`,
        variant: 'destructive',
      });
      return;
    }

    const totalWithFee = withdrawAmount + WITHDRAWAL_FEE;
    if (totalWithFee > available) {
      toast({
        title: 'Insufficient Balance',
        description: `You need at least $${totalWithFee.toFixed(2)} (including $${WITHDRAWAL_FEE} fee)`,
        variant: 'destructive',
      });
      return;
    }

    withdrawMutation.mutate(withdrawAmount);
  };

  const withdrawAmount = parseFloat(amount) || 0;
  const totalCost = withdrawAmount + WITHDRAWAL_FEE;
  const youWillReceive = withdrawAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-withdraw">
        <DialogHeader>
          <DialogTitle>Withdraw {asset}</DialogTitle>
          <DialogDescription>
            Withdraw funds from your {asset} balance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 p-3 bg-accent/20 border border-accent rounded-md">
            <FiAlertCircle className="w-4 h-4 text-accent-foreground flex-shrink-0" />
            <p className="text-sm text-accent-foreground">
              Minimum withdrawal: ${MINIMUM_WITHDRAWAL} | Fee: ${WITHDRAWAL_FEE}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">Amount (USD)</Label>
            <Input
              id="withdraw-amount"
              type="number"
              placeholder={`Minimum $${MINIMUM_WITHDRAWAL}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={MINIMUM_WITHDRAWAL}
              step="0.01"
              data-testid="input-withdraw-amount"
            />
            <p className="text-xs text-muted-foreground">
              Available: ${available.toFixed(2)}
            </p>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Withdrawal amount</span>
              <span className="font-mono">${withdrawAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Network fee</span>
              <span className="font-mono">${WITHDRAWAL_FEE.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-medium text-foreground">
              <span>Total cost</span>
              <span className="font-mono">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-accent-foreground">
              <span>You will receive</span>
              <span className="font-mono">${youWillReceive.toFixed(2)}</span>
            </div>
          </div>

          <Button
            onClick={handleWithdraw}
            disabled={!amount || withdrawMutation.isPending}
            className="w-full"
            variant="destructive"
            data-testid="button-confirm-withdraw"
          >
            {withdrawMutation.isPending ? 'Processing...' : 'Confirm Withdrawal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
