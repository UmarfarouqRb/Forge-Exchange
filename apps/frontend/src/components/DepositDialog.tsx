
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
import { TOKENS, VAULT_SPOT_ADDRESS, Token, WETH_ADDRESS } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { WethAbi } from '@/abis/Weth';
import { parseUnits, erc20Abi } from 'viem';
import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { useTrackedTx } from '@/hooks/useTrackedTx';

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Token;
}

export function DepositDialog({ open, onOpenChange, asset }: DepositDialogProps) {
  const [amount, setAmount] = useState('');
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | undefined>();
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | undefined>();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const token = TOKENS[asset];

  const { data: allowance, refetch } = useReadContract({
    address: token.address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, VAULT_SPOT_ADDRESS] : undefined,
    query: {
      enabled: !!address && !!token,
    }
  });

  useTrackedTx({
    hash: depositTxHash,
    onSuccess: () => {
      refetch(); // Refetch allowance after successful deposit
      onOpenChange(false);
    }
  });

  useTrackedTx({
    hash: approvalTxHash,
    onSuccess: () => {
      refetch();
      handleDeposit();
    }
  });

  const handleDeposit = async () => {
    if (!amount || !token) return;

    try {
      const parsedAmount = parseUnits(amount, token.decimals);

      if (asset === 'ETH') {
        // Wrap ETH to WETH
        const wrapHash = await writeContractAsync({
            address: WETH_ADDRESS,
            abi: WethAbi,
            functionName: 'deposit',
            value: parsedAmount,
        });
        setDepositTxHash(wrapHash);

        // Deposit WETH
        const depositHash = await writeContractAsync({
            address: VAULT_SPOT_ADDRESS,
            abi: VaultSpotAbi,
            functionName: 'deposit',
            args: [WETH_ADDRESS, parsedAmount]
        });
        setDepositTxHash(depositHash);
      } else {
        const needsApproval = allowance === undefined || allowance < parsedAmount;

        if (needsApproval) {
          const approvalHash = await writeContractAsync({
            address: token.address,
            abi: erc20Abi,
            functionName: 'approve',
            args: [VAULT_SPOT_ADDRESS, parsedAmount]
          });
          setApprovalTxHash(approvalHash);
        } else {
            const depositHash = await writeContractAsync({
                address: VAULT_SPOT_ADDRESS,
                abi: VaultSpotAbi,
                functionName: 'deposit',
                args: [token.address, parsedAmount]
              });
              setDepositTxHash(depositHash);
        }
      }
      
      setAmount('');
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
            disabled={!amount}
            className="w-full"
            data-testid="button-confirm-deposit"
          >
            Confirm Deposit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
