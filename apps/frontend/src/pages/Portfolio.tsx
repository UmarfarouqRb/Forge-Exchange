
import { useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useReadContracts } from 'wagmi';
import { VAULT_SPOT_ADDRESS } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { formatUnits } from 'viem';
import { FiDownload, FiUpload } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVault } from '@/contexts/VaultContext';

interface Asset {
  symbol: string;
  balance: number;
  deposit_enabled: boolean;
  withdraw_enabled: boolean;
}

export default function Portfolio() {
  const { authenticated } = usePrivy();
  const { address } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();

  const { tokens: allTokens, isLoading: tokensLoading } = useVault();

  const tokenContracts = useMemo(() => {
    return allTokens.map(token => ({
      address: VAULT_SPOT_ADDRESS as `0x${string}`,
      abi: VaultSpotAbi,
      functionName: 'availableBalance',
      args: address ? [address, token.address] : undefined,
    }));
  }, [address, allTokens]);

  const { data: balances, isLoading: assetsLoading, isError, refetch } = useReadContracts({
    contracts: tokenContracts,
    query: {
      enabled: authenticated && !!address && !tokensLoading,
    }
  });

  useEffect(() => {
    refetch();
  }, [location, refetch]);

  const assets: Asset[] = useMemo(() => {
    if (!balances) return [];
    return allTokens.map((token, index) => {
      const balance = balances[index];
      const available = balance.status === 'success' ? formatUnits(balance.result as bigint, token.decimals) : '0';

      return {
        symbol: token.symbol,
        balance: parseFloat(available),
        deposit_enabled: token.deposit_enabled,
        withdraw_enabled: token.withdraw_enabled,
      };
    }).filter(asset => asset.balance > 0);
  }, [balances, allTokens]);

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-muted-foreground">Please connect your wallet to view your portfolio.</p>
      </div>
    );
  }

  const isLoading = tokensLoading || assetsLoading;

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
          {/* Deposit/Withdraw Card for Mobile */}
          <Card className="mb-6 md:hidden">
            <CardContent className="p-4 flex gap-4">
              <Button className="flex-1" onClick={() => navigate('/assets/deposit')}>
                <FiDownload className="w-4 h-4 mr-2" />
                Deposit
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => navigate('/assets/withdraw')}>
                <FiUpload className="w-4 h-4 mr-2" />
                Withdraw
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset: Asset) => (
              <Card key={asset.symbol}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{asset.symbol}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{asset.balance}</div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/assets/deposit?asset=${asset.symbol}`)} disabled={!asset.deposit_enabled}>Deposit</Button>
                    <Button size="sm" variant="destructive" onClick={() => navigate(`/assets/withdraw?asset=${asset.symbol}`)} disabled={!asset.withdraw_enabled}>Withdraw</Button>
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
    </div>
  );
}
