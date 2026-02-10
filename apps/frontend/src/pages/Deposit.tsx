
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
import { useWriteContract, useReadContract, useBalance } from 'wagmi';
import { useWallets } from '@privy-io/react-auth';
import { useTrackedTx } from '@/hooks/useTrackedTx';
import { wagmiConfig } from '@/wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { FiLoader } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRefetchContext } from '@/contexts/RefetchContext';
import { useVault } from '@/contexts/VaultContext';
import { VaultAssetSelector } from '@/components/VaultAssetSelector';

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

  useEffect(() => {
    if (assetSymbolFromUrl) {
      setSelectedAssetSymbol(assetSymbolFromUrl);
    }
  }, [assetSymbolFromUrl]);

  const { wallets } = useWallets();
  const connectedWallet = wallets[0];
  const { address } = connectedWallet || {};
  const { writeContractAsync } = useWriteContract();

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

  const handleDeposit = async () => {
    setMessage(null);
    console.log("Initiating deposit...");
    if (!connectedWallet) {
      toast.error('Please connect your wallet first.');
      console.error("Wallet not connected.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount.');
      console.error("Invalid amount entered.");
      return;
    }
    if (!selectedToken) {
      toast.error('Please select a valid asset to deposit.');
      console.error("No asset selected.");
      return;
    }

    const parsedAmount = parseUnits(amount, selectedToken.decimals);

    if (balance && balance.value < parsedAmount) {
      toast.error('Insufficient balance for this deposit.');
      console.error("Insufficient balance.");
      return;
    }

    setIsDepositing(true);
    const toastId = toast.loading('Initiating deposit...');
    console.log(`Deposit details:`, {
        token: selectedToken.symbol,
        amount: amount,
        parsedAmount: parsedAmount.toString(),
        userAddress: address,
    });

    try {
        if (selectedAssetSymbol === 'ETH') {
            console.log("Processing ETH deposit...");
            
            // Step 1: Wrap ETH to WETH
            toast.loading('Step 1/3: Wrapping ETH to WETH...', { id: toastId });
            console.log("Wrapping ETH to WETH for amount:", amount);
            const wrapHash = await writeContractAsync({
                address: WETH_ADDRESS as `0x${string}`,
                abi: WethAbi,
                functionName: 'deposit',
                value: parsedAmount,
            });
            await waitForTransactionReceipt(wagmiConfig, { hash: wrapHash });
            toast.success('Step 1/3: ETH wrapped successfully!');
            console.log("ETH wrapping tx successful:", wrapHash);

            // Step 2: Approve Vault to spend WETH
            toast.loading('Step 2/3: Approving vault to spend WETH...', { id: toastId });
            console.log("Approving Vault to spend WETH...");
            const approveHash = await writeContractAsync({
                address: WETH_ADDRESS as `0x${string}`,
                abi: erc20Abi,
                functionName: 'approve',
                args: [VAULT_SPOT_ADDRESS, parsedAmount],
            });
            await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
            toast.success('Step 2/3: Approval successful!');
            console.log("WETH approval tx successful:", approveHash);

            // Step 3: Deposit WETH into Vault
            toast.loading('Step 3/3: Depositing WETH into vault...', { id: toastId });
            console.log("Depositing WETH into vault...");
            const depositHash = await writeContractAsync({
                address: VAULT_SPOT_ADDRESS,
                abi: VaultSpotAbi,
                functionName: 'deposit',
                args: [WETH_ADDRESS as `0x${string}`, parsedAmount],
            });
            setDepositTxHash(depositHash);
            console.log("WETH deposit tx sent:", depositHash);
            
        } else { // ERC20 Logic
            const needsApproval = allowance === undefined || allowance < parsedAmount;
            if (needsApproval) {
                console.log(`Approving ${selectedToken.symbol}...`);
                toast.loading(`Approving ${selectedToken.symbol}...`, { id: toastId });
                const approvalHash = await writeContractAsync({
                    address: selectedToken.address as `0x${string}`,
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [VAULT_SPOT_ADDRESS, parsedAmount],
                });
                await waitForTransactionReceipt(wagmiConfig, { hash: approvalHash });
                toast.success('Approval successful!');
                refetch();
                console.log(`${selectedToken.symbol} approval transaction sent:`, approvalHash);
            }

            console.log(`Depositing ${selectedToken.symbol}...`);
            toast.loading(`Depositing ${selectedToken.symbol}...`, { id: toastId });
            const depositHash = await writeContractAsync({
                address: VAULT_SPOT_ADDRESS,
                abi: VaultSpotAbi,
                functionName: 'deposit',
                args: [selectedToken.address as `0x${string}`, parsedAmount],
            });

            console.log(`${selectedToken.symbol} deposit transaction sent:`, depositHash);
            setDepositTxHash(depositHash);
        }
        setAmount('');
    } catch (err: any) {
        console.error("Deposit failed:", err);
        toast.error(err.shortMessage || 'An error occurred during the deposit.');
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
