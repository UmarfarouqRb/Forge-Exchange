
import { useState } from 'react';
import { ethers } from 'ethers';
import { useWallets } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VAULT_SPOT_ADDRESS, WETH_ADDRESS } from '@/config/contracts';
import { VaultAssetSelector } from './VaultAssetSelector';

// Simplified ABIs for the contracts
const vaultAbi = [
  'function withdraw(address token, uint256 amount)',
  'function withdrawETH(uint256 amount)',
];

export function Withdraw() {
  const [asset, setAsset] = useState('');
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { wallets } = useWallets();
  const { toast } = useToast();

  const handleWithdraw = async () => {
    if (!wallets[0]) {
      toast({ title: 'Wallet not connected', variant: 'destructive' });
      return;
    }

    setIsWithdrawing(true);
    const connectedWallet = wallets[0];
    await connectedWallet.switchChain(84532);
    const chainId = parseInt(connectedWallet.chainId.split(':')[1]);
    

    const vaultAddress = VAULT_SPOT_ADDRESS[chainId];
    const wethAddress = WETH_ADDRESS[chainId];

    if (!vaultAddress || !wethAddress) {
        toast({ title: 'Unsupported Network', description: 'Please switch to a supported network to withdraw.', variant: 'destructive' });
        setIsWithdrawing(false);
        return;
    }

    const eip1193provider = await connectedWallet.getEthereumProvider();
    const provider = new ethers.BrowserProvider(eip1193provider);
    const signer = await provider.getSigner();

    try {
      // Assuming 18 decimals for simplicity, as per original code.
      // A robust solution would get decimals from the selected asset object.
      const withdrawAmount = ethers.parseEther(amount);

      const vaultContract = new ethers.Contract(vaultAddress, vaultAbi, signer);
      let withdrawTx;

      if (asset.toLowerCase() === wethAddress.toLowerCase()) {
        toast({ title: 'Withdrawing ETH' });
        withdrawTx = await vaultContract.withdrawETH(withdrawAmount);
      } else {
        toast({ title: `Withdrawing token` });
        withdrawTx = await vaultContract.withdraw(asset, withdrawAmount);
      }
      
      await withdrawTx.wait();

      toast({ title: 'Withdrawal Successful', description: `Successfully withdrawn ${amount}.` });
      setAmount('');

    } catch (error: unknown) { 
        console.error(error);
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'reason' in error) {
            // Handle ethers error object
            errorMessage = (error as { reason: string }).reason;
        }
        toast({ title: 'Withdrawal Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="withdraw-asset">Asset</Label>
            <VaultAssetSelector asset={asset} setAsset={setAsset} type="withdraw" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">Amount</Label>
            <Input 
              id="withdraw-amount" 
              type="number" 
              placeholder="0.1" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isWithdrawing}
            />
          </div>
          <Button 
            className="w-full" 
            onClick={handleWithdraw}
            disabled={isWithdrawing || !amount || !asset}
          >
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
