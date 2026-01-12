
import { useReadContracts, useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrivy } from '@privy-io/react-auth';
import { FiSearch, FiDownload, FiUpload, FiEye, FiEyeOff } from 'react-icons/fi';
import { useState, useMemo } from 'react';
import { DepositDialog } from '@/components/DepositDialog';
import { WithdrawDialog } from '@/components/WithdrawDialog';
import { TOKENS, VAULT_SPOT_ADDRESS, Token } from '@/config/contracts';
import { VaultSpotAbi } from '@/abis/VaultSpot';
import { formatUnits } from 'viem';

export default function Assets() {
  const { authenticated } = usePrivy();
  const { address } = useAccount();
  const [hideSmallBalances, setHideSmallBalances] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const { data: balances, isLoading: assetsLoading, error: assetsError } = useReadContracts({
    contracts: tokenContracts,
    query: {
      enabled: authenticated && !!address,
    }
  });

  const displayAssets = useMemo(() => {
    if (!balances) return [];
    const assets = (Object.keys(TOKENS) as Token[]).map((tokenSymbol, index) => {
      const balance = balances[index];
      const token = TOKENS[tokenSymbol];
      const available = balance.status === 'success' ? formatUnits(balance.result as bigint, token.decimals) : '0';

      return {
        asset: tokenSymbol,
        available,
      };
    });

    return assets.filter(asset => {
      const matchesSearch = asset.asset.toLowerCase().includes(searchQuery.toLowerCase());
      const meetsBalanceThreshold = !hideSmallBalances || parseFloat(asset.available) > 0;
      return matchesSearch && meetsBalanceThreshold;
    });

  }, [balances, searchQuery, hideSmallBalances]);

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold mb-6 text-foreground">Assets</h1>
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>Your Assets</CardTitle>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHideSmallBalances(!hideSmallBalances)}
                  data-testid="button-toggle-small-balances"
                  className="w-full sm:w-auto justify-start sm:justify-center"
                >
                  {hideSmallBalances ? (
                    <>
                      <FiEye className="w-4 h-4 mr-2" />
                      Show Small
                    </>
                  ) : (
                    <>
                      <FiEyeOff className="w-4 h-4 mr-2" />
                      Hide Small
                    </>
                  )}
                </Button>
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
              ) : assetsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="hidden md:grid grid-cols-3 gap-4 p-4 items-center">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24 ml-auto" />
                    <Skeleton className="h-5 w-24 ml-auto" />
                  </div>
                ))
              ) : displayAssets && displayAssets.length > 0 ? (
                displayAssets.map((asset) => (
                  <div
                    key={asset.asset}
                    className="hidden md:grid grid-cols-3 gap-4 p-4 items-center hover-elevate"
                    data-testid={`row-asset-${asset.asset}`}>
                    <div>
                      <div className="font-medium text-foreground">{asset.asset}</div>
                    </div>
                    <div className="text-right font-mono">{asset.available}</div>
                    <div className="text-right flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setDepositDialog({ open: true, asset: asset.asset })}
                        data-testid={`button-deposit-${asset.asset}`}>
                        <FiDownload className="w-3 h-3 mr-1" />
                        Deposit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setWithdrawDialog({ open: true, asset: asset.asset })}
                        data-testid={`button-withdraw-${asset.asset}`}>
                        <FiUpload className="w-3 h-3 mr-1" />
                        Withdraw
                      </Button>
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

      {/* Deposit Dialog */}
      {depositDialog.asset && (
        <DepositDialog
          open={depositDialog.open}
          onOpenChange={(open) => setDepositDialog({ open, asset: open ? depositDialog.asset : '' })}
          asset={depositDialog.asset}
        />
      )}

      {/* Withdraw Dialog */}
      {withdrawDialog.asset && (
        <WithdrawDialog
          open={withdrawDialog.open}
          onOpenChange={(open) => setWithdrawDialog({ open, asset: open ? withdrawDialog.asset : '' })}
          asset={withdrawDialog.asset}
        />
      )}
    </div>
  );
}
