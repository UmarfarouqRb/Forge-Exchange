
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import { DepositDialog } from '@/components/DepositDialog';
import { WithdrawDialog } from '@/components/WithdrawDialog';
import { TOKENS, VAULT_SPOT_ADDRESS, Token } from '@/config/contracts';
import { useAccount, useReadContracts } from 'wagmi';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { formatUnits } from 'viem';

// Define a type for our asset object
interface Asset {
  symbol: string;
  balance: number;
}

export default function Portfolio() {
  const { authenticated } = usePrivy();
  const { address } = useAccount();
  const [depositDialog, setDepositDialog] = useState<{ open: boolean; asset: Token | '' }>({ open: false, asset: '' });
  const [withdrawDialog, setWithdrawDialog] = useState<{ open: boolean; asset: Token | '' }>({ open: false, asset: '' });

  const tokenContracts = useMemo(() => {
    return (Object.keys(TOKENS) as Token[]).map(tokenSymbol => ({
      address: VAULT_SPOT_ADDRESS as `0x${string}`,
      abi: VaultSpotAbi,
      functionName: 'availableBalance',
      args: address ? [address, TOKENS[tokenSymbol].address] : undefined,
    }));
  }, [address]);

  const { data: balances, isLoading, isError } = useReadContracts({
    contracts: tokenContracts,
    query: {
      enabled: authenticated && !!address,
    }
  });

  const assets: Asset[] = useMemo(() => {
    if (!balances) return [];
    return (Object.keys(TOKENS) as Token[]).map((tokenSymbol, index) => {
      const balance = balances[index];
      const token = TOKENS[tokenSymbol];
      const available = balance.status === 'success' ? formatUnits(balance.result as bigint, token.decimals) : '0';

      return {
        symbol: tokenSymbol,
        balance: parseFloat(available),
      };
    }).filter(asset => asset.balance > 0);
  }, [balances]);

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-muted-foreground">Please connect your wallet to view your portfolio.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center p-4">Loading assets...</div>;
  }

  if (isError) {
    return <div className="text-center p-4 text-red-500">Error fetching assets.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Tabs defaultValue="spot">
        <TabsList>
          <TabsTrigger value="spot">Spot</TabsTrigger>
          <TabsTrigger value="futures">Futures</TabsTrigger>
        </TabsList>
        <TabsContent value="spot">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.map((asset: Asset) => (
                <Card key={asset.symbol}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{asset.symbol}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">{asset.balance}</div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setDepositDialog({ open: true, asset: asset.symbol as Token })}>Deposit</Button>
                        <Button size="sm" variant="destructive" onClick={() => setWithdrawDialog({ open: true, asset: asset.symbol as Token })}>Withdraw</Button>
                      </div>
                    </CardContent>
                </Card>
                ))}
            </div>
        </TabsContent>
        <TabsContent value="futures">
          <p className="text-center p-4 text-muted-foreground">Futures portfolio coming soon.</p>
        </TabsContent>
      </Tabs>

      {/* Deposit Dialog */}
      {depositDialog.asset &&
        <DepositDialog
          open={depositDialog.open}
          onOpenChange={(open) => setDepositDialog({ open, asset: open ? depositDialog.asset : '' })}
          asset={depositDialog.asset}
        />
      }

      {/* Withdraw Dialog */}
      {withdrawDialog.asset &&
        <WithdrawDialog
          open={withdrawDialog.open}
          onOpenChange={(open) => setWithdrawDialog({ open, asset: open ? withdrawDialog.asset : '' })}
          asset={withdrawDialog.asset}
        />
      }
    </div>
  );
}
