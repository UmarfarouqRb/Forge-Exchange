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

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: string;
  walletAddress: string;
}

const MINIMUM_DEPOSIT = 10;

export function DepositDialog({ open, onOpenChange, asset, walletAddress }: DepositDialogProps) {
  const [amount, setAmount] = useState('');
  const { toast } = useToast();

  const depositMutation = useMutation({
    mutationFn: async (depositAmount: number) => {
      return apiRequest('/api/transactions/deposit', 'POST', {
        walletAddress,
        asset,
        amount: depositAmount.toString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets', walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', walletAddress] });
      toast({
        title: 'Deposit Successful',
        description: `${amount} ${asset} has been deposited to your account.`,
      });
      setAmount('');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Deposit Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDeposit = () => {
    const depositAmount = parseFloat(amount);
    
    if (isNaN(depositAmount) || depositAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (depositAmount < MINIMUM_DEPOSIT) {
      toast({
        title: 'Minimum Deposit Required',
        description: `The minimum deposit amount is $${MINIMUM_DEPOSIT}`,
        variant: 'destructive',
      });
      return;
    }

    depositMutation.mutate(depositAmount);
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
          <div className="flex items-center gap-2 p-3 bg-accent/20 border border-accent rounded-md">
            <FiAlertCircle className="w-4 h-4 text-accent-foreground flex-shrink-0" />
            <p className="text-sm text-accent-foreground">
              Minimum deposit: ${MINIMUM_DEPOSIT}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deposit-amount">Amount (USD)</Label>
            <Input
              id="deposit-amount"
              type="number"
              placeholder={`Minimum $${MINIMUM_DEPOSIT}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={MINIMUM_DEPOSIT}
              step="0.01"
              data-testid="input-deposit-amount"
            />
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Amount</span>
              <span className="font-mono">${amount || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span>Fees</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-medium text-foreground">
              <span>You will receive</span>
              <span className="font-mono">${amount || '0.00'}</span>
            </div>
          </div>

          <Button
            onClick={handleDeposit}
            disabled={!amount || depositMutation.isPending}
            className="w-full"
            data-testid="button-confirm-deposit"
          >
            {depositMutation.isPending ? 'Processing...' : 'Confirm Deposit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
