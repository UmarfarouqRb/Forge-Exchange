
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { VAULT_SPOT_ADDRESS } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import { useTrackedTx } from '@/hooks/useTrackedTx';
import { FiLoader } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVault } from '@/contexts/VaultContext';
import { useChainContext } from '@/contexts/chain-context';
import { VaultAssetSelector } from '@/components/VaultAssetSelector';
import { useTransaction } from '@/hooks/useTransaction';
import { useVaultBalance } from '@/hooks/useVaultBalance';
import { TransactionError } from '@/types/errors';
import { safeAddress } from '@/lib/utils';

export default function Withdraw() {
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawTxHash, setWithdrawTxHash] = useState<`0x${string}` | undefined>();
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string | ''>( '');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const assetSymbolFromUrl = params.get('asset');

  const { assets: allAssets } = useVault();
  const { writeContractAsync } = useTransaction();

  useEffect(() => {
    if (assetSymbolFromUrl) {
      const canonicalSymbol = assetSymbolFromUrl === 'ETH' ? 'WETH' : assetSymbolFromUrl;
      setSelectedAssetSymbol(canonicalSymbol);
    }
  }, [assetSymbolFromUrl]);

  const { address } = useAccount();
  const { selectedChain } = useChainContext();
  const chainId = selectedChain?.id;

  const selectedAsset = allAssets.find(a => a.token.symbol === selectedAssetSymbol);
  const settlementToken = selectedAsset?.token;

  const vaultAddress = safeAddress(VAULT_SPOT_ADDRESS);
  const tokenAddress = safeAddress(settlementToken?.address);

  const { data: vaultBalance, refetch: refetchVaultBalance } = useVaultBalance(tokenAddress);

  useTrackedTx({
    hash: withdrawTxHash,
    onSuccess: () => {
      refetchVaultBalance();
      setMessage({ type: 'success', text: 'Withdrawal successful! Your balance will update shortly.' });
      toast.success('Withdrawal successful!');
      setIsWithdrawing(false);
      setAmount('');
    }
  });

  const handleWithdraw = async () => {
    setMessage(null);
    if (!address) {
      setMessage({ type: 'error', text: 'Please connect your wallet first.' });
      toast.error('Please connect your wallet first.');
      return;
    }
    if (!vaultAddress) {
      setMessage({ type: 'error', text: 'Unsupported network. Please switch to Base Sepolia.' });
      toast.error('Unsupported network. Please switch to Base Sepolia.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
        setMessage({ type: 'error', text: 'Please enter a valid amount.' });
        toast.error('Please enter a valid amount.');
        return;
    }
    if (!selectedAsset || !settlementToken) {
        setMessage({ type: 'error', text: 'Please select a valid asset to withdraw.' });
        toast.error('Please select a valid asset to withdraw.');
        return;
    }

    const parsedAmount = parseUnits(amount, settlementToken.decimals);
    
    if (typeof vaultBalance !== 'bigint' || vaultBalance < parsedAmount) {
        setMessage({ type: 'error', text: 'Insufficient vault balance for this withdrawal.' });
        toast.error('Insufficient vault balance for this withdrawal.');
        return;
    }

    console.log({
      token: settlementToken.symbol,
      address: settlementToken.address,
      amount: parsedAmount.toString(),
      vaultAddress: vaultAddress,
    });

    setIsWithdrawing(true);
    const toastId = toast.loading('Processing withdrawal...');

    try {
        let txHash;

        if (settlementToken.symbol === "WETH") {
            toast.loading('Withdrawing ETH...', { id: toastId });
            txHash = await writeContractAsync({
                address: vaultAddress,
                abi: VaultSpotAbi,
                functionName: "withdrawETH",
                args: [parsedAmount],
            });
        } else {
            const tokenAddr = safeAddress(settlementToken.address);
            if (!tokenAddr) {
              throw new Error('Invalid token address');
            }
            toast.loading(`Withdrawing ${settlementToken.symbol}...`, { id: toastId });
            txHash = await writeContractAsync({
                address: vaultAddress,
                abi: VaultSpotAbi,
                functionName: "withdraw",
                args: [tokenAddr, parsedAmount],
            });
        }

        setWithdrawTxHash(txHash);
    } catch (err) {
        console.error("Withdraw error:", err);
        const errorMsg = (err as TransactionError).shortMessage || 'An error occurred during the withdrawal.';
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg, { id: toastId });
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
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4" role="alert">
                    <p className="font-bold">Reminder</p>
                    <p>Currently Deposits and withdrawals are processed on the Base Sepolia network.</p>
                </div>
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
