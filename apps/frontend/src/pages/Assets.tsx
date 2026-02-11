
import { useReadContracts } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { FiSearch, FiDownload, FiUpload } from 'react-icons/fi';
import { useState, useMemo } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { VAULT_SPOT_ADDRESS } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { useVault } from '@/contexts/VaultContext';
import { formatBalance } from '@/lib/format';

export default function Assets() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const connectedWallet = wallets[0];
  const { address } = connectedWallet || {};
  const [searchQuery, setSearchQuery] = useState('');
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

  const { data: balances, isLoading: assetsLoading, error: assetsError } = useReadContracts({
    contracts: tokenContracts,
    query: {
      enabled: authenticated && !!address && !tokensLoading,
    }
  });

  const displayAssets = useMemo(() => {
    const assets = allTokens.map((token, index) => {
        const balance = balances ? balances[index] : undefined;
        const available = balance && balance.status === 'success' ? formatBalance(balance.result as bigint, token.decimals) : '0.000000';

        return {
            ...token,
            available,
        };
    });

    return assets.filter(asset => 
        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
}, [balances, searchQuery, allTokens]);


  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FiDownload className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to view and manage your assets
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isBaseAssetsPage = location.pathname === '/assets' || location.pathname === '/assets/';
  const isLoading = tokensLoading || assetsLoading;

  return (
    <div className="min-h-screen bg-background p-6">
        {isBaseAssetsPage ? (
            <div className="container mx-auto max-w-7xl">
                <h1 className="text-3xl font-bold mb-6 text-foreground">Assets</h1>

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

                <Card className="mb-6">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle>Your Assets</CardTitle>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                            data-testid="input-search-assets"
                        />
                        </div>
                    </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="hidden md:grid grid-cols-3 gap-4 p-4 border-b border-border text-xs font-medium text-muted-foreground">
                    <div>Asset</div>
                    <div className="text-right">Available</div>
                    <div className="text-right">Actions</div>
                    </div>
                    <div className="divide-y divide-border">
                    {assetsError ? (
                        <div className="p-12 text-center">
                        <div className="max-w-md mx-auto">
                            <p className="text-destructive font-medium mb-2">Failed to load assets</p>
                            <p className="text-sm text-muted-foreground mb-4">{(assetsError as Error).message}</p>
                            <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                            size="sm"
                            data-testid="button-retry-assets"
                            >
                            Retry
                            </Button>
                        </div>
                        </div>
                    ) : isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 items-center">
                            <div className="flex justify-between items-center md:hidden">
                                <span className="text-sm text-muted-foreground">Asset</span>
                                <Skeleton className="h-5 w-20" />
                            </div>
                            <div className="md:hidden">
                                <Skeleton className="h-5 w-20" />
                            </div>

                            <div className="hidden md:block">
                            <Skeleton className="h-5 w-20" />
                            </div>


                            <div className="flex justify-between items-center md:hidden">
                                <span className="text-sm text-muted-foreground">Available</span>
                                <Skeleton className="h-5 w-24" />
                            </div>
                            <div className="hidden md:block ml-auto">
                                <Skeleton className="h-5 w-24" />
                            </div>

                            <div className="flex justify-between items-center mt-2 md:hidden">
                                <span className="text-sm text-muted-foreground">Actions</span>
                                <Skeleton className="h-8 w-44" />
                            </div>
                            <div className="hidden md:block ml-auto">
                                <Skeleton className="h-8 w-44" />
                            </div>
                        </div>
                        ))
                    ) : displayAssets && displayAssets.length > 0 ? (
                        displayAssets.map((asset) => (
                        <div
                            key={asset.symbol}
                            className="grid grid-cols-1 md:grid-cols-3 gap-y-2 md:gap-4 p-4 items-center hover-elevate"
                            data-testid={`row-asset-${asset.symbol}`}>
                            <div className="flex justify-between items-center md:block">
                            <span className="text-sm text-muted-foreground md:hidden">Asset</span>
                            <div className="font-medium text-foreground">{asset.symbol}</div>
                            </div>

                            <div className="flex justify-between items-center md:block md:text-right">
                                <span className="text-sm text-muted-foreground md:hidden">Available</span>
                                <div className="font-mono">{asset.available}</div>
                            </div>

                            <div className="flex justify-between items-center mt-2 md:mt-0 md:block md:text-right">
                                <span className="text-sm text-muted-foreground md:hidden">Actions</span>
                            <div className="flex gap-2 justify-end">
                                <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/assets/deposit?asset=${asset.symbol}`)}
                                data-testid={`button-deposit-${asset.symbol}`}
                                disabled={!asset.deposit_enabled}>
                                <FiDownload className="w-3 h-3 mr-1" />
                                Deposit
                                </Button>
                                <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/assets/withdraw?asset=${asset.symbol}`)}
                                data-testid={`button-withdraw-${asset.symbol}`}
                                disabled={!asset.withdraw_enabled}>
                                <FiUpload className="w-3 h-3 mr-1" />
                                Withdraw
                                </Button>
                            </div>
                            </div>
                        </div>
                        ))
                    ) : (
                        <div className="p-12 text-center text-muted-foreground">No assets found</div>
                    )}
                    </div>
                </CardContent>
                </Card>
            </div>
        ) : (
            <Outlet />
        )}
    </div>
  );
}
