
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
  'function deposit() payable',
  'function approve(address spender, uint256 amount) returns (bool)',
];

const vaultAbi = [
  'function deposit(address token, uint256 amount)',
];

export function Deposit() {
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const { wallets } = useWallets();
  const { toast } = useToast();

  const handleDeposit = async () => {
    if (!wallets[0]) {
      toast({ title: 'Wallet not connected', variant: 'destructive' });
      return;
    }

    setIsDepositing(true);
    const connectedWallet = wallets[0];
    const chainId = parseInt(connectedWallet.chainId.split(':')[1]);

    const vaultAddress = VAULT_SPOT_ADDRESS[chainId];
    const wethAddress = WETH_ADDRESS[chainId];

    if (!vaultAddress || !wethAddress) {
        toast({ title: 'Unsupported Network', description: 'Please switch to a supported network to deposit.', variant: 'destructive' });
        setIsDepositing(false);
        return;
    }

    const eip1193provider = await connectedWallet.getEthereumProvider();
    const provider = new ethers.BrowserProvider(eip1193provider);
    const signer = await provider.getSigner();

    try {
      const depositAmount = ethers.parseEther(amount);

      // Step 1: Wrap ETH to WETH
      toast({ title: 'Step 1/2: Wrapping ETH to WETH' });
      const wethContract = new ethers.Contract(wethAddress, wethAbi, signer);
      const wrapTx = await wethContract.deposit({ value: depositAmount });
      await wrapTx.wait();
      toast({ title: 'ETH Wrapped Successfully' });

      // Step 2: Deposit WETH into the Vault
      toast({ title: 'Step 2/2: Depositing WETH into Vault' });

      // First, approve the vault to spend the WETH
      const approveTx = await wethContract.approve(vaultAddress, depositAmount);
      await approveTx.wait();

      const vaultContract = new ethers.Contract(vaultAddress, vaultAbi, signer);
      const depositTx = await vaultContract.deposit(wethAddress, depositAmount);
      await depositTx.wait();

      toast({ title: 'Deposit Successful', description: `${amount} WETH has been deposited into the vault.` });
      setAmount('');

    } catch (error: any) { 
        console.error(error);
        toast({ title: 'Deposit Failed', description: error.reason || error.message || 'An unknown error occurred.', variant: 'destructive' });
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposit ETH</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deposit-amount">Amount in ETH</Label>
            <Input 
              id="deposit-amount" 
              type="number" 
              placeholder="0.1" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isDepositing}
            />
          </div>
          <Button 
            className="w-full" 
            onClick={handleDeposit}
            disabled={isDepositing || !amount}
          >
            {isDepositing ? 'Depositing...' : 'Deposit'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
