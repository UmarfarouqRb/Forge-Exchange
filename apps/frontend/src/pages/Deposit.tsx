
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { VAULT_SPOT_ADDRESS, WETH_ADDRESS } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { WethAbi } from '@/abis/Weth';
import { parseUnits, erc20Abi } from 'viem';
import { useReadContract, useBalance } from 'wagmi';
import { useWallets } from '@privy-io/react-auth';
import { useTrackedTx } from '@/hooks/useTrackedTx';
import { wagmiConfig } from '@/wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { FiLoader } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRefetchContext } from '@/contexts/RefetchContext';
import { useVault } from '@/contexts/VaultContext';
import { VaultAssetSelector } from '@/components/VaultAssetSelector';
import { useTransaction } from '@/hooks/useTransaction';

export default function Deposit() {
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | undefined>();
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string | ''>('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const { triggerRefetch } = useRefetchContext();

  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const assetSymbolFromUrl = params.get('asset');

  const { tokens: allTokens } = useVault();
  const { writeContractAsync } = useTransaction();

  useEffect(() => {
    if (assetSymbolFromUrl) {
      setSelectedAssetSymbol(assetSymbolFromUrl);
    }
  }, [assetSymbolFromUrl]);

  const { wallets } = useWallets();
  const connectedWallet = wallets[0];
  const { address } = connectedWallet || {};

  const selectedToken = allTokens.find(t => t.symbol === selectedAssetSymbol);

  const { data: balance } = useBalance({
    address: address as `0x${string}` | undefined,
    token: selectedAssetSymbol === 'ETH' ? undefined : (selectedToken?.address as `0x${string}` | undefined),
    query: {
      enabled: !!address && !!selectedAssetSymbol,
    },
  });

  const { data: allowance, refetch } = useReadContract({
    address: selectedToken?.address as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address as `0x${string}`, VAULT_SPOT_ADDRESS] : undefined,
    query: {
      enabled: !!address && !!selectedToken && selectedAssetSymbol !== 'ETH',
    },
  });

  useTrackedTx({
    hash: depositTxHash,
    onSuccess: () => {
      refetch();
      triggerRefetch();
      setMessage({ type: 'success', text: 'Deposit successful! Your balance will update shortly.' });
      toast.success('Deposit successful!');
      setIsDepositing(false);
    },
  });

  const handleEthDeposit = async (parsedAmount: bigint) => {
    const toastId = toast.loading('Initiating ETH deposit...');
    try {
      toast.loading('Step 1/3: Wrapping ETH to WETH...', { id: toastId });
      const wrapHash = await writeContractAsync({
          address: WETH_ADDRESS as `0x${string}`,
          abi: WethAbi,
          functionName: 'deposit',
          value: parsedAmount,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: wrapHash });
      toast.success('Step 1/3: ETH wrapped successfully!');

      toast.loading('Step 2/3: Approving vault to spend WETH...', { id: toastId });
      const approveHash = await writeContractAsync({
          address: WETH_ADDRESS as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [VAULT_SPOT_ADDRESS, parsedAmount],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
      toast.success('Step 2/3: Approval successful!');

      toast.loading('Step 3/3: Depositing WETH into vault...', { id: toastId });
      const depositHash = await writeContractAsync({
          address: VAULT_SPOT_ADDRESS,
          abi: VaultSpotAbi,
          functionName: 'deposit',
          args: [WETH_ADDRESS as `0x${string}`, parsedAmount],
      });
      setDepositTxHash(depositHash);
    } catch (err: any) {
        const errorMsg = err.shortMessage || 'An error occurred during the ETH deposit.';
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg, { id: toastId });
        setIsDepositing(false);
    }
  }

  const handleErc20Deposit = async (parsedAmount: bigint, token: any) => {
    const toastId = toast.loading(`Initiating ${token.symbol} deposit...`);
    try {
        const needsApproval = allowance === undefined || allowance < parsedAmount;
        if (needsApproval) {
            toast.loading(`Approving ${token.symbol}...`, { id: toastId });
            const approvalHash = await writeContractAsync({
                address: token.address as `0x${string}`,
                abi: erc20Abi,
                functionName: 'approve',
                args: [VAULT_SPOT_ADDRESS, parsedAmount],
            });
            await waitForTransactionReceipt(wagmiConfig, { hash: approvalHash });
            toast.success('Approval successful!');
            refetch();
        }

        toast.loading(`Depositing ${token.symbol}...`, { id: toastId });
        const depositHash = await writeContractAsync({
            address: VAULT_SPOT_ADDRESS,
            abi: VaultSpotAbi,
            functionName: 'deposit',
            args: [token.address as `0x${string}`, parsedAmount],
        });

        setDepositTxHash(depositHash);
    } catch (err: any) {
        const errorMsg = err.shortMessage || `An error occurred during the ${token.symbol} deposit.`;
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg, { id: toastId });
        setIsDepositing(false);
    }
  }

  const handleDeposit = async () => {
    setMessage(null);
    if (!connectedWallet) {
        const errorMsg = 'Please connect your wallet first.';
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg);
        return;
    }
    if (!amount || parseFloat(amount) <= 0) {
        const errorMsg = 'Please enter a valid amount.';
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg);
        return;
    }
    if (!selectedToken) {
        const errorMsg = 'Please select a valid asset to deposit.';
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg);
        return;
    }

    const parsedAmount = parseUnits(amount, selectedToken.decimals);

    if (balance && balance.value < parsedAmount) {
        const errorMsg = 'Insufficient balance for this deposit.';
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg);
        return;
    }

    setIsDepositing(true);
    setAmount('');

    if (selectedAssetSymbol === 'ETH') {
      handleEthDeposit(parsedAmount);
    } else {
      handleErc20Deposit(parsedAmount, selectedToken);
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
            <div className={`p-4 rounded-md my-4 ${message.type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-green-100 border border-green-400 text-green-700'}`}>
              <p>{message.text}</p>
            </div>
          )}
          <div className="space-y-4 py-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="asset-selector" className="mb-2">Select Asset</Label>
              <VaultAssetSelector 
                asset={selectedAssetSymbol}
                setAsset={setSelectedAssetSymbol} 
                type="deposit"
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
                disabled={isDepositing || !selectedAssetSymbol}
              />
            </div>

            <Button
              onClick={handleDeposit}
              disabled={!amount || isDepositing || !selectedAssetSymbol}
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
