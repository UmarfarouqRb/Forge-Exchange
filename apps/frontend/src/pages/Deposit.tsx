import { useState, useEffect, useContext, useMemo } from 'react';
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
import { NewAssetSelector } from '@/components/NewAssetSelector';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRefetchContext } from '@/contexts/RefetchContext';
import { MarketDataContext } from '@/contexts/MarketDataContext';
import { Token } from '@/types';

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

  const { pairs, isLoading: isLoadingPairs, isError } = useContext(MarketDataContext)!;

  const allTokens = useMemo(() => {
    const tokens = new Map<string, Token>();
    pairs.forEach(pair => {
      if (pair.baseToken) tokens.set(pair.baseToken.symbol, pair.baseToken);
      if (pair.quoteToken) tokens.set(pair.quoteToken.symbol, pair.quoteToken);
    });
    return Array.from(tokens.values());
  }, [pairs]);

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
    if (!connectedWallet) {
      toast.error('Please connect your wallet first.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (!selectedToken) {
      toast.error('Please select a valid asset to deposit.');
      return;
    }

    const parsedAmount = parseUnits(amount, selectedToken.decimals);

    if (balance && balance.value < parsedAmount) {
      toast.error('Insufficient balance for this deposit.');
      return;
    }

    setIsDepositing(true);
    const toastId = toast.loading('Initiating deposit...');

    try {
      if (selectedAssetSymbol === 'ETH') {
        // ETH deposit logic will require a separate handling since it is not in the pairs
        toast.info('ETH deposit is not supported yet.');
        setIsDepositing(false);
      } else {
        const needsApproval = allowance === undefined || allowance < parsedAmount;

        if (needsApproval) {
          toast.loading(`Approving ${selectedAssetSymbol}...`, { id: toastId });
          const approvalHash = await writeContractAsync({
            address: selectedToken.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'approve',
            args: [VAULT_SPOT_ADDRESS, parsedAmount],
          });
          await waitForTransactionReceipt(wagmiConfig, { hash: approvalHash });
          toast.success('Approval successful!');
          refetch();
        }

        toast.loading(`Depositing ${selectedAssetSymbol}...`, { id: toastId });
        const depositHash = await writeContractAsync({
          address: VAULT_SPOT_ADDRESS,
          abi: VaultSpotAbi,
          functionName: 'deposit',
          args: [selectedToken.address as `0x${string}`, parsedAmount],
        });
        setDepositTxHash(depositHash);
      }
      setAmount('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.shortMessage || 'An error occurred during the deposit.');
      setIsDepositing(false);
    }
  };

  const assetSelectorAssets = allTokens.map(token => ({ id: token.symbol, symbol: token.symbol }));

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
              <NewAssetSelector 
                asset={selectedAssetSymbol}
                setAsset={setSelectedAssetSymbol} 
                assets={assetSelectorAssets}
                isLoading={isLoadingPairs}
                isError={isError}
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
