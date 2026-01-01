import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrivy } from '@privy-io/react-auth';
import { FiSearch, FiDownload, FiUpload, FiEye, FiEyeOff } from 'react-icons/fi';
import { useState } from 'react';
import { DepositDialog } from '@/components/DepositDialog';
import { WithdrawDialog } from '@/components/WithdrawDialog';
import type { Asset, Transaction } from '../types';

export default function Assets() {
  const { user, authenticated } = usePrivy();
  const wallet = user?.wallet;
  const [hideSmallBalances, setHideSmallBalances] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [depositDialog, setDepositDialog] = useState<{ open: boolean; asset: string }>({ open: false, asset: '' });
  const [withdrawDialog, setWithdrawDialog] = useState<{ open: boolean; asset: string; available: number }>({ 
    open: false, 
    asset: '', 
    available: 0 
  });

  const { data: assets, isLoading: assetsLoading, error: assetsError } = useQuery<Asset[]>({
    queryKey: ['/api/assets', wallet?.address],
    queryFn: async () => {
      if (!wallet?.address) return [];
      const response = await fetch(`/api/assets/${wallet.address}`);
      if (!response.ok) throw new Error('Failed to fetch assets');
      return response.json();
    },
    enabled: authenticated && !!wallet?.address,
  });

  const { data: transactions, isLoading: transactionsLoading, error: transactionsError } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions', wallet?.address],
    queryFn: async () => {
      if (!wallet?.address) return [];
      const response = await fetch(`/api/transactions/${wallet.address}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    enabled: authenticated && !!wallet?.address,
  });

  const totalBalance = assets?.reduce((acc, asset) => acc + parseFloat(asset.usdValue), 0) || 0;
  const totalAvailable = assets?.reduce((acc, asset) => acc + parseFloat(asset.available) * parseFloat(asset.usdValue) / parseFloat(asset.total), 0) || 0;
  const totalInOrder = assets?.reduce((acc, asset) => acc + parseFloat(asset.inOrder) * parseFloat(asset.usdValue) / parseFloat(asset.total), 0) || 0;

  const filteredAssets = assets?.filter((asset) => {
    const matchesSearch = asset.asset.toLowerCase().includes(searchQuery.toLowerCase());
    const meetsBalanceThreshold = !hideSmallBalances || parseFloat(asset.usdValue) >= 10;
    return matchesSearch && meetsBalanceThreshold;
  });

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Balance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono" data-testid="text-total-balance">
                    ${totalBalance.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Available Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono" data-testid="text-available-balance">
                    ${totalAvailable.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    In Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono" data-testid="text-in-orders">
                    ${totalInOrder.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    24h PnL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-chart-2" data-testid="text-pnl">
                    +$1,234.56
                  </div>
                  <p className="text-xs text-chart-2 mt-1">+5.2%</p>
                </CardContent>
              </Card>
            </div>
            {/* Assets Table */}
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
                <div className="hidden md:grid grid-cols-6 gap-4 p-4 border-b border-border text-xs font-medium text-muted-foreground">
                  <div>Asset</div>
                  <div className="text-right">Total</div>
                  <div className="text-right">Available</div>
                  <div className="text-right">In Order</div>
                  <div className="text-right">USD Value</div>
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
                      <div key={i} className="hidden md:grid grid-cols-6 gap-4 p-4 items-center">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-24 ml-auto" />
                        <Skeleton className="h-5 w-24 ml-auto" />
                        <Skeleton className="h-5 w-24 ml-auto" />
                        <Skeleton className="h-5 w-24 ml-auto" />
                        <Skeleton className="h-5 w-24 ml-auto" />
                      </div>
                    ))
                  ) : filteredAssets && filteredAssets.length > 0 ? (
                    filteredAssets.map((asset) => (
                      <>
                        {/* Desktop view */}
                        <div
                          key={`${asset.id}-desktop`}
                          className="hidden md:grid grid-cols-6 gap-4 p-4 items-center hover-elevate"
                          data-testid={`row-asset-${asset.asset}`}
                        >
                          <div>
                            <div className="font-medium text-foreground">{asset.asset}</div>
                            <div className="text-xs text-muted-foreground">
                              {asset.asset === 'BTC' ? 'Bitcoin' : asset.asset === 'ETH' ? 'Ethereum' : 'Tether'}
                            </div>
                          </div>
                          <div className="text-right font-mono">{parseFloat(asset.total).toFixed(8)}</div>
                          <div className="text-right font-mono">
                            {parseFloat(asset.available).toFixed(8)}
                          </div>
                          <div className="text-right font-mono">
                            {parseFloat(asset.inOrder).toFixed(8)}
                          </div>
                          <div className="text-right font-mono font-medium">
                            ${parseFloat(asset.usdValue).toLocaleString()}
                          </div>
                          <div className="text-right flex gap-2 justify-end">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setDepositDialog({ open: true, asset: asset.asset })}
                              data-testid={`button-deposit-${asset.asset}`}
                            >
                              <FiDownload className="w-3 h-3 mr-1" />
                              Deposit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setWithdrawDialog({ 
                                open: true, 
                                asset: asset.asset,
                                available: parseFloat(asset.available)
                              })}
                              data-testid={`button-withdraw-${asset.asset}`}
                            >
                              <FiUpload className="w-3 h-3 mr-1" />
                              Withdraw
                            </Button>
                          </div>
                        </div>
                        {/* Mobile view */}
                        <div
                          key={`${asset.id}-mobile`}
                          className="md:hidden p-4 hover-elevate space-y-3"
                          data-testid={`card-asset-${asset.asset}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-foreground text-lg">{asset.asset}</div>
                              <div className="text-sm text-muted-foreground">
                                {asset.asset === 'BTC' ? 'Bitcoin' : asset.asset === 'ETH' ? 'Ethereum' : 'Tether'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-semibold text-foreground">
                                ${parseFloat(asset.usdValue).toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">USD Value</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Total</div>
                              <div className="font-mono">{parseFloat(asset.total).toFixed(6)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Available</div>
                              <div className="font-mono">{parseFloat(asset.available).toFixed(6)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">In Order</div>
                              <div className="font-mono">{parseFloat(asset.inOrder).toFixed(6)}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1"
                              onClick={() => setDepositDialog({ open: true, asset: asset.asset })}
                              data-testid={`button-deposit-mobile-${asset.asset}`}
                            >
                              <FiDownload className="w-3 h-3 mr-1" />
                              Deposit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1"
                              onClick={() => setWithdrawDialog({ 
                                open: true, 
                                asset: asset.asset,
                                available: parseFloat(asset.available)
                              })}
                              data-testid={`button-withdraw-mobile-${asset.asset}`}
                            >
                              <FiUpload className="w-3 h-3 mr-1" />
                              Withdraw
                            </Button>
                          </div>
                        </div>
                      </>
                    ))
                  ) : (
                    <div className="p-12 text-center text-muted-foreground">No assets found</div>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="hidden md:grid grid-cols-6 gap-4 p-4 border-b border-border text-xs font-medium text-muted-foreground">
                  <div>Date</div>
                  <div>Type</div>
                  <div>Asset</div>
                  <div className="text-right">Amount</div>
                  <div>Status</div>
                  <div>TxHash</div>
                </div>
                <div className="divide-y divide-border">
                  {transactionsError ? (
                    <div className="p-12 text-center">
                      <div className="max-w-md mx-auto">
                        <p className="text-destructive font-medium mb-2">Failed to load transactions</p>
                        <p className="text-sm text-muted-foreground mb-4">{(transactionsError as Error).message}</p>
                        <Button
                          onClick={() => window.location.reload()}
                          variant="outline"
                          size="sm"
                          data-testid="button-retry-transactions"
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : transactionsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="grid grid-cols-6 gap-4 p-4 items-center">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-24 ml-auto" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    ))
                  ) : transactions && transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="grid grid-cols-6 gap-4 p-4 items-center hover-elevate"
                        data-testid={`row-transaction-${tx.id}`}
                      >
                        <div className="text-sm">
                          {new Date(tx.timestamp).toLocaleString()}
                        </div>
                        <div>
                          <Badge
                            variant={
                              tx.type === 'deposit'
                                ? 'default'
                                : tx.type === 'withdrawal'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {tx.type}
                          </Badge>
                        </div>
                        <div className="font-medium">{tx.asset}</div>
                        <div className="text-right font-mono">
                          {tx.type === 'withdrawal' ? '-' : '+'}{parseFloat(tx.amount).toFixed(8)}
                        </div>
                        <div>
                          <Badge
                            variant={
                              tx.status === 'completed'
                                ? 'default'
                                : tx.status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {tx.status}
                          </Badge>
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {tx.txHash ? `${tx.txHash.substring(0, 10)}...${tx.txHash.substring(tx.txHash.length - 8)}` : '-'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-muted-foreground">
                      No transaction history
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Deposit Dialog */}
      {wallet?.address && (
        <DepositDialog
          open={depositDialog.open}
          onOpenChange={(open) => setDepositDialog({ ...depositDialog, open })}
          asset={depositDialog.asset}
          walletAddress={wallet.address}
        />
      )}

      {/* Withdraw Dialog */}
      {wallet?.address && (
        <WithdrawDialog
          open={withdrawDialog.open}
          onOpenChange={(open) => setWithdrawDialog({ ...withdrawDialog, open })}
          asset={withdrawDialog.asset}
          walletAddress={wallet.address}
          available={withdrawDialog.available}
        />
      )}
    </div>
  );
}
