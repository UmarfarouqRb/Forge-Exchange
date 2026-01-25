import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { TOKENS, VAULT_SPOT_ADDRESS, Token, WETH_ADDRESS } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { WethAbi } from '@/abis/Weth';
import { parseUnits, erc20Abi } from 'viem';
import { useWriteContract, useReadContract, useBalance } from 'wagmi';
import { useWallets } from '@privy-io/react-auth';
import { useTrackedTx } from '@/hooks/useTrackedTx';
import { wagmiConfig } from '@/wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { FiLoader } from 'react-icons/fi';
import { NewAssetSelector } from '@/components/NewAssetSelector';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Deposit() {
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | undefined>();
  const [selectedAsset, setSelectedAsset] = useState<Token | ''>('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const asset = params.get('asset') as Token;

  useEffect(() => {
    setSelectedAsset(asset || '');
  }, [asset]);

  const { wallets } = useWallets();
  const connectedWallet = wallets[0];
  const { address } = connectedWallet || {};
  const { writeContractAsync } = useWriteContract();
  const token = selectedAsset ? TOKENS[selectedAsset] : undefined;

  const { data: balance } = useBalance({
    address,
    token: selectedAsset === 'ETH' ? undefined : token?.address,
    query: {
      enabled: !!address && !!selectedAsset,
    },
  });

  const { data: allowance, refetch } = useReadContract({
    address: token?.address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, VAULT_SPOT_ADDRESS] : undefined,
    query: {
      enabled: !!address && !!token && selectedAsset !== 'ETH',
    },
  });

  useTrackedTx({
    hash: depositTxHash,
    onSuccess: () => {
      refetch();
      setMessage({ type: 'success', text: 'Deposit successful! Your balance will update shortly.' });
      toast.success('Deposit successful!');
    },
  });

  const handleDeposit = async () => {
    setMessage(null);
    if (!connectedWallet) {
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
      const errorMessage = 'Please select a valid asset to deposit.';
      setMessage({ type: 'error', text: errorMessage });
      return;
    }

    const parsedAmount = parseUnits(amount, token.decimals);

    if (balance && balance.value < parsedAmount) {
      const errorMessage = 'Insufficient balance for this deposit.';
      setMessage({ type: 'error', text: errorMessage });
      return;
    }

    setIsDepositing(true);
    const toastId = toast.loading('Initiating deposit...');

    try {
      if (selectedAsset === 'ETH') {
        toast.loading('Step 1/3: Wrapping ETH to WETH...', { id: toastId });
        const wrapHash = await writeContractAsync({
          address: WETH_ADDRESS,
          abi: WethAbi,
          functionName: 'deposit',
          value: parsedAmount,
        });

        toast.loading(`Step 1/3: Waiting for wrapping transaction... (tx: ${wrapHash.substring(0, 10)}...)`, { id: toastId });
        await waitForTransactionReceipt(wagmiConfig, { hash: wrapHash });
        
        toast.loading('Step 2/3: Approving vault to spend WETH...', { id: toastId });
        const approvalHash = await writeContractAsync({
          address: WETH_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [VAULT_SPOT_ADDRESS, parsedAmount],
        });

        toast.loading(`Step 2/3: Waiting for approval... (tx: ${approvalHash.substring(0, 10)}...)`, { id: toastId });
        await waitForTransactionReceipt(wagmiConfig, { hash: approvalHash });
        
        toast.loading('Step 3/3: Depositing WETH into vault...', { id: toastId });
        const depositHash = await writeContractAsync({
          address: VAULT_SPOT_ADDRESS,
          abi: VaultSpotAbi,
          functionName: 'deposit',
          args: [WETH_ADDRESS, parsedAmount],
        });
        toast.loading(`Step 3/3: Waiting for deposit transaction... (tx: ${depositHash.substring(0, 10)}...)`, { id: toastId });
        setDepositTxHash(depositHash);
      } else {
        const needsApproval = allowance === undefined || allowance < parsedAmount;

        if (needsApproval) {
          toast.loading(`Step 1/2: Requesting approval to spend your ${selectedAsset}...`, { id: toastId });
          const approvalHash = await writeContractAsync({
            address: token.address,
            abi: erc20Abi,
            functionName: 'approve',
            args: [VAULT_SPOT_ADDRESS, parsedAmount],
          });
          
          toast.loading(`Step 1/2: Waiting for approval transaction... (tx: ${approvalHash.substring(0, 10)}...)`, { id: toastId });
          await waitForTransactionReceipt(wagmiConfig, { hash: approvalHash });
          toast.success('Approval successful!', { id: toastId });
          refetch();
        }

        toast.loading(`Step 2/2: Depositing ${selectedAsset} into vault...`, { id: toastId });
        const depositHash = await writeContractAsync({
          address: VAULT_SPOT_ADDRESS,
          abi: VaultSpotAbi,
          functionName: 'deposit',
          args: [token.address, parsedAmount],
        });
        toast.loading(`Step 2/2: Waiting for deposit transaction... (tx: ${depositHash.substring(0, 10)}...)`, { id: toastId });
        setDepositTxHash(depositHash);
      }
      
      setAmount('');
    } catch (err: unknown) {
      console.error(err);
      let errorMessage = 'An error occurred during the deposit.';
      if (err && typeof err === 'object' && 'shortMessage' in err) {
        errorMessage = String(err.shortMessage) || errorMessage;
      }
      setMessage({ type: 'error', text: errorMessage });
      toast.error(errorMessage, { id: toastId });
      setIsDepositing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Deposit</CardTitle>
        </CardHeader>
        <CardContent>
          {message && (
            <div
              className={`p-4 rounded-md my-4 ${message.type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-green-100 border border-green-400 text-green-700'}`}>
              <p>{message.text}</p>
            </div>
          )}
          <div className="space-y-4 py-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="asset-selector" className="mb-2">Select Asset</Label>
              <NewAssetSelector asset={selectedAsset} setAsset={setSelectedAsset} />
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
              data-testid="button-confirm-deposit">
              {isDepositing ? (
                <>
                  <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Deposit'
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
