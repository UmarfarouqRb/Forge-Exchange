
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { VAULT_SPOT_ADDRESS, WETH_ADDRESS } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { WethAbi } from '@/abis/Weth';
import { parseUnits } from 'viem';
import { useWriteContract } from 'wagmi';
import { useWallets } from '@privy-io/react-auth';
import { useTrackedTx } from '@/hooks/useTrackedTx';
import { wagmiConfig } from '@/wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { FiLoader } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRefetchContext } from '@/contexts/RefetchContext';
import { useVault } from '@/contexts/VaultContext';
import { VaultAssetSelector } from '@/components/VaultAssetSelector';

export default function Withdraw() {
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawTxHash, setWithdrawTxHash] = useState<`0x${string}` | undefined>();
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

  useTrackedTx({
    hash: withdrawTxHash,
    onSuccess: () => {
      triggerRefetch();
      toast.success('Withdrawal successful!');
      setIsWithdrawing(false);
    }
  });

  const handleWithdraw = async () => {
    setMessage(null);
    console.log("Initiating withdrawal...");
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
        toast.error('Please select a valid asset to withdraw.');
        console.error("No asset selected.");
        return;
    }

    setIsWithdrawing(true);
    const toastId = toast.loading("Initiating withdrawal...");
    console.log(`Withdrawal details:`, {
        token: selectedToken.symbol,
        amount: amount,
        userAddress: address,
    });

    try {
      const parsedAmount = parseUnits(amount, selectedToken.decimals);

      if (selectedAssetSymbol === 'ETH') {
        console.log("Processing ETH withdrawal...");
        
        // Step 1: Withdraw WETH from the Vault
        toast.loading('Step 1/2: Withdrawing WETH from vault...', { id: toastId });
        console.log("Withdrawing WETH from vault...");
        const withdrawHash = await writeContractAsync({
            address: VAULT_SPOT_ADDRESS,
            abi: VaultSpotAbi,
            functionName: 'withdraw',
            args: [WETH_ADDRESS as `0x${string}`, parsedAmount],
          });
        await waitForTransactionReceipt(wagmiConfig, { hash: withdrawHash });
        toast.success('Step 1/2: WETH withdrawn successfully!');
        console.log("WETH withdrawal tx successful:", withdrawHash);

        // Step 2: Unwrap WETH to ETH
        toast.loading('Step 2/2: Unwrapping WETH to ETH...', { id: toastId });
        console.log("Unwrapping WETH to ETH...");
        const unwrapHash = await writeContractAsync({
            address: WETH_ADDRESS as `0x${string}`,
            abi: WethAbi,
            functionName: 'withdraw',
            args: [parsedAmount],
        });
        setWithdrawTxHash(unwrapHash);
        console.log("WETH unwrapping tx sent:", unwrapHash);

      } else {
        console.log(`Withdrawing ${selectedToken.symbol}...`);
        toast.loading(`Withdrawing ${selectedToken.symbol}...`, { id: toastId });
        const withdrawHash = await writeContractAsync({
          address: VAULT_SPOT_ADDRESS,
          abi: VaultSpotAbi,
          functionName: 'withdraw',
          args: [selectedToken.address as `0x${string}`, parsedAmount]
        });
        setWithdrawTxHash(withdrawHash);
        console.log(`${selectedToken.symbol} withdraw transaction sent:`, withdrawHash);
      }
      setAmount('');
    } catch (err: any) {
      console.error("Withdrawal failed:", err);
      toast.error(err.shortMessage || "An error occurred during the withdrawal.");
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Withdraw</CardTitle>
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
                            type="withdraw"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="withdraw-amount">Amount</Label>
                        <Input
                        id="withdraw-amount"
                        type="number"
                        placeholder={`0.00`}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isWithdrawing || !selectedAssetSymbol}
                        />
                    </div>

                    <Button
                        onClick={handleWithdraw}
                        disabled={!amount || isWithdrawing || !selectedAssetSymbol}
                        className="w-full"
                        variant="destructive"
                        data-testid="button-confirm-withdraw"
                    >
                        {isWithdrawing ? (
                        <>
                            <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                        ) : (
                        'Confirm Withdrawal'
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
