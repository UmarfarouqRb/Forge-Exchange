
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { VAULT_SPOT_ADDRESS } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { parseUnits, erc20Abi } from 'viem';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { useTrackedTx } from '@/hooks/useTrackedTx';
import { config } from '@/wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { FiLoader } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVault } from '@/contexts/VaultContext';
import { VaultAssetSelector } from '@/components/VaultAssetSelector';
import { useTransaction } from '@/hooks/useTransaction';
import { useVaultBalance } from '@/hooks/useVaultBalance';
import { Token } from '@/types/market-data';
import { TransactionError } from '@/types/errors';
import { safeAddress } from '@/lib/utils';

export default function Deposit() {
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | undefined>();
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
      setSelectedAssetSymbol(assetSymbolFromUrl);
    }
  }, [assetSymbolFromUrl]);

  const { address } = useAccount();

  const selectedAsset = allAssets.find(a => a.displayToken.symbol === selectedAssetSymbol);
  const settlementToken = selectedAsset?.token;
  const displayToken = selectedAsset?.displayToken;

  const tokenAddress = safeAddress(settlementToken?.address);
  const vaultAddress = safeAddress(VAULT_SPOT_ADDRESS);

  const { refetch: refetchVaultBalance } = useVaultBalance(tokenAddress);

  const { data: balance } = useBalance({
    address: address,
    token: selectedAssetSymbol === 'ETH' ? undefined : tokenAddress,
    query: {
      enabled: !!address && !!selectedAssetSymbol,
    },
  });

  const { data: allowance, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && vaultAddress ? [address, vaultAddress] : undefined,
    query: {
      enabled: !!address && !!tokenAddress && !!vaultAddress && selectedAssetSymbol !== 'ETH',
    },
  });

  useTrackedTx({
    hash: depositTxHash,
    onSuccess: () => {
      refetch();
      refetchVaultBalance();
      setMessage({ type: 'success', text: 'Deposit successful! Your balance will update shortly.' });
      toast.success('Deposit successful!');
      setIsDepositing(false);
    },
  });

  const handleEthDeposit = async (parsedAmount: bigint) => {
    const toastId = toast.loading('Initiating ETH deposit...');
    if (!vaultAddress) return;
    try {
      toast.loading('Depositing ETH into vault...', { id: toastId });
      const depositHash = await writeContractAsync({
          address: vaultAddress,
          abi: VaultSpotAbi,
          functionName: 'depositETH',
          value: parsedAmount
      });
      setDepositTxHash(depositHash);
    } catch (err: unknown) {
        const errorMsg = (err as TransactionError).shortMessage || 'An error occurred during the ETH deposit.';
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg, { id: toastId });
        setIsDepositing(false);
    }
  }

  const handleErc20Deposit = async (parsedAmount: bigint, token: Token) => {
    const toastId = toast.loading(`Initiating ${token.symbol} deposit...`);
    const tokenAddr = safeAddress(token.address)
    if(!tokenAddr || !vaultAddress) return;

    try {
        const needsApproval = allowance == null || allowance < parsedAmount;
        if (needsApproval) {
            toast.loading(`Approving ${token.symbol}...`, { id: toastId });
            const approvalHash = await writeContractAsync({
                address: tokenAddr,
                abi: erc20Abi,
                functionName: 'approve',
                args: [vaultAddress, parsedAmount],
            });
            await waitForTransactionReceipt(config, { hash: approvalHash });
            toast.success('Approval successful!');
            refetch();
        }

        toast.loading(`Depositing ${token.symbol}...`, { id: toastId });
        const depositHash = await writeContractAsync({
            address: vaultAddress,
            abi: VaultSpotAbi,
            functionName: 'deposit',
            args: [tokenAddr, parsedAmount],
        });

        setDepositTxHash(depositHash);
    } catch (err: unknown) {
        const errorMsg = (err as TransactionError).shortMessage || `An error occurred during the ${token.symbol} deposit.`;
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg, { id: toastId });
        setIsDepositing(false);
    }
  }

  const handleDeposit = async () => {
    setMessage(null);
    if (!address) {
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
    if (!selectedAsset || !settlementToken || !displayToken) {
        const errorMsg = 'Please select a valid asset to deposit.';
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg);
        return;
    }

    const parsedAmount = parseUnits(amount, settlementToken.decimals);

    if (balance == null || balance.value < parsedAmount) {
        const errorMsg = 'Insufficient balance for this deposit.';
        setMessage({ type: 'error', text: errorMsg });
        toast.error(errorMsg);
        return;
    }

    setIsDepositing(true);
    setAmount('');

    if (displayToken.symbol === 'ETH') {
      handleEthDeposit(parsedAmount);
    } else {
      handleErc20Deposit(parsedAmount, settlementToken);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Deposit</CardTitle>
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
