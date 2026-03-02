
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
import { VaultAssetSelector } from '@/components/VaultAssetSelector';
import { useTransaction } from '@/hooks/useTransaction';
import { useVaultBalance } from '@/hooks/useVaultBalance';
import { Token } from '@/types/market-data';
import { TransactionError } from '@/types/errors';
import { safeAddress } from '@/lib/utils';

export default function InternalTransfer() {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTxHash, setTransferTxHash] = useState<`0x${string}` | undefined>();
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string | ''>( '');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

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

  const { address } = useAccount();

  const selectedToken = allTokens.find(t => t.symbol === selectedAssetSymbol);
  const tokenAddress = safeAddress(selectedToken?.address);
  const vaultAddress = safeAddress(VAULT_SPOT_ADDRESS);

  const { data: vaultBalance, refetch: refetchVaultBalance } = useVaultBalance(tokenAddress);

  useTrackedTx({
    hash: transferTxHash,
    onSuccess: () => {
      refetchVaultBalance();
      setMessage({ type: 'success', text: 'Transfer successful! Your balance will update shortly.' });
      toast.success('Transfer successful!');
      setIsTransferring(false);
    }
  });

  const handleTransfer = async () => {
    setMessage(null);
    if (!address) {
      setMessage({ type: 'error', text: 'Please connect your wallet first.' });
      toast.error('Please connect your wallet first.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount.' });
      toast.error('Please enter a valid amount.');
      return;
    }
    if (!recipient) {
      setMessage({ type: 'error', text: 'Please enter a valid recipient address.' });
      toast.error('Please enter a valid recipient address.');
      return;
    }
    if (!selectedToken) {
      setMessage({ type: 'error', text: 'Please select a valid asset to transfer.' });
      toast.error('Please select a valid asset to transfer.');
      return;
    }

    const parsedAmount = parseUnits(amount, selectedToken.decimals);

    if (typeof vaultBalance !== 'bigint' || vaultBalance < parsedAmount) {
      setMessage({ type: 'error', text: 'Insufficient vault balance for this transfer.' });
      toast.error('Insufficient vault balance for this transfer.');
      return;
    }

    setIsTransferring(true);
    setAmount('');

    try {
      const toastId = toast.loading('Initiating internal transfer...');
      if (!vaultAddress || !tokenAddress) return;

      const transferHash = await writeContractAsync({
        address: vaultAddress,
        abi: VaultSpotAbi,
        functionName: 'internalTransfer',
        args: [recipient, tokenAddress, parsedAmount]
      });
      setTransferTxHash(transferHash);
    } catch (err: unknown) {
      const errorMsg = (err as TransactionError).shortMessage || `An error occurred during the transfer.`;
      setMessage({ type: 'error', text: errorMsg });
      toast.error(errorMsg);
      setIsTransferring(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Internal Transfer</CardTitle>
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
              <Label htmlFor="recipient-address">Recipient Address</Label>
              <Input
                id="recipient-address"
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={isTransferring || !selectedAssetSymbol}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-amount">Amount</Label>
              <Input
                id="transfer-amount"
                type="number"
                placeholder={`0.00`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isTransferring || !selectedAssetSymbol}
              />
            </div>

            <Button
              onClick={handleTransfer}
              disabled={!amount || !recipient || isTransferring || !selectedAssetSymbol}
              className="w-full"
              data-testid="button-confirm-transfer">
              {isTransferring ? (
                <>
                  <FiLoader className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Transfer'
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
