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
import { parseUnits, erc20Abi } from 'viem';
import { useWriteContract, useReadContract, useAccount, useWalletClient } from 'wagmi';
import { useTrackedTx } from '@/hooks/useTrackedTx';
import { wagmiConfig } from '@/wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { FiLoader } from 'react-icons/fi';
import { NewAssetSelector } from './NewAssetSelector';

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: Token;
}

export function DepositDialog({ open, onOpenChange, asset }: DepositDialogProps) {
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | undefined>();
  const [selectedAsset, setSelectedAsset] = useState<Token | ''>(asset || '');

  useEffect(() => {
    setSelectedAsset(asset || '');
    setAmount('');
  }, [asset, open]);

  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const token = selectedAsset ? TOKENS[selectedAsset] : undefined;

  const { data: allowance, refetch } = useReadContract({
    address: token?.address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, VAULT_SPOT_ADDRESS] : undefined,
    query: {
      enabled: !!address && !!token && selectedAsset !== 'ETH',
    }
  });

  useTrackedTx({
    hash: depositTxHash,
    onSuccess: () => {
      refetch();
      onOpenChange(false);
      toast.success("Deposit successful!");
    }
  });

  const handleDeposit = async () => {
    if (!isConnected || !walletClient || !address) {
      toast.error("Please connect your wallet first.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
        toast.error("Please enter a valid amount.");
        return;
    }
    if (!token || !selectedAsset) {
        toast.error("Selected asset is not valid.");
        return;
    }

    setIsDepositing(true);
    toast.loading("Initiating deposit...");

    try {
      const parsedAmount = parseUnits(amount, token.decimals);

      if (selectedAsset === 'ETH') {
        toast.loading("Wrapping ETH to WETH...");
        const wrapHash = await writeContractAsync({
            address: WETH_ADDRESS,
            abi: WethAbi,
            functionName: 'deposit',
            value: parsedAmount
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: wrapHash });
        toast.success("ETH wrapped successfully! Proceeding with approval.");

        toast.loading("Approving vault to spend WETH...");
        const approvalHash = await writeContractAsync({
            address: WETH_ADDRESS,
            abi: erc20Abi,
            functionName: 'approve',
            args: [VAULT_SPOT_ADDRESS, parsedAmount]
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: approvalHash });
        toast.success("Approval successful! Depositing WETH.");

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
          toast.loading("Requesting approval to spend your " + selectedAsset);
          const approvalHash = await writeContractAsync({
            address: token.address,
            abi: erc20Abi,
            functionName: 'approve',
            args: [VAULT_SPOT_ADDRESS, parsedAmount]
          });
          
          toast.loading("Waiting for approval transaction to complete...");
          await waitForTransactionReceipt(wagmiConfig, { hash: approvalHash });
          toast.success("Approval successful! Proceeding with deposit.");
          refetch();
        }

        const depositHash = await writeContractAsync({
            address: VAULT_SPOT_ADDRESS,
            abi: VaultSpotAbi,
            functionName: 'deposit',
            args: [token.address, parsedAmount]
          });
        setDepositTxHash(depositHash);
      }
      
      setAmount('');

    } catch (err: unknown) {
      console.error(err);
      let message = "An error occurred during the deposit.";
      if (err && typeof err === 'object' && 'shortMessage' in err) {
        message = String(err.shortMessage) || message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setIsDepositing(false);
    } 
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-deposit">
        <DialogHeader>
          <DialogTitle>Deposit</DialogTitle>
          <DialogDescription>
            Select an asset and enter the amount you want to deposit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="asset-selector">Asset</Label>
                <NewAssetSelector
                asset={selectedAsset}
                setAsset={setSelectedAsset}
                />
            </div>

          <div className="space-y-2">
            <Label htmlFor="deposit-amount">Amount</Label>
            <Input
              id="deposit-amount"
              type="number"
              placeholder={`0.00`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isDepositing || !selectedAsset}
            />
          </div>

          <Button
            onClick={handleDeposit}
            disabled={!amount || isDepositing || !selectedAsset}
            className="w-full"
            data-testid="button-confirm-deposit"
          >
            {isDepositing ? (
              <>
                <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                Depositing...
              </>
            ) : (
              "Confirm Deposit"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
