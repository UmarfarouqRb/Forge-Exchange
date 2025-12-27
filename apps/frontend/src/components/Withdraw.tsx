
import { useState } from 'react';
import { ethers } from 'ethers';
import { useWallets } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VAULT_SPOT_ADDRESS, WETH_ADDRESS } from '@/lib/contracts';

// Simplified ABIs for the contracts
const wethAbi = [
  'function withdraw(uint256 amount)',
];

const vaultAbi = [
  'function withdraw(address token, uint256 amount)',
];

export function Withdraw() {
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
      const withdrawAmount = ethers.parseEther(amount);

      // Step 1: Withdraw WETH from the Vault
      toast({ title: 'Step 1/2: Withdrawing WETH from Vault' });
      const vaultContract = new ethers.Contract(vaultAddress, vaultAbi, signer);
      const withdrawTx = await vaultContract.withdraw(wethAddress, withdrawAmount);
      await withdrawTx.wait();
      toast({ title: 'WETH Withdrawn Successfully' });

      // Step 2: Unwrap WETH to ETH
      toast({ title: 'Step 2/2: Unwrapping WETH to ETH' });
      const wethContract = new ethers.Contract(wethAddress, wethAbi, signer);
      const unwrapTx = await wethContract.withdraw(withdrawAmount);
      await unwrapTx.wait();

      toast({ title: 'Withdrawal Successful', description: `You have successfully withdrawn ${amount} ETH.` });
      setAmount('');

    } catch (error: any) { 
        console.error(error);
        toast({ title: 'Withdrawal Failed', description: error.reason || error.message || 'An unknown error occurred.', variant: 'destructive' });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw ETH</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">Amount in ETH</Label>
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
            disabled={isWithdrawing || !amount}
          >
            {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
