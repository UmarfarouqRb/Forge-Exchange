
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrivy } from '@privy-io/react-auth';
import { FiSearch, FiDownload, FiUpload, FiSend } from 'react-icons/fi';
import { useState, useMemo } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useVault } from '@/contexts/VaultContext';
import { formatUSD } from '@/lib/format';
import { VaultAsset } from '@/types/market-data';
import { useQueryClient } from '@tanstack/react-query';
import { getDisplaySymbol } from '@/utils/tokenDisplay';
import { UserPoints } from '@/components/UserPoints';
import { LevelBadge } from '@/components/LevelBadge';

function AssetRow({ asset }: { asset: VaultAsset }) {
    const navigate = useNavigate();
    const displaySymbol = getDisplaySymbol(asset.token);
    const availableUSD = asset.balanceUSD ? formatUSD(asset.balanceUSD) : '-';

    return (
        <div
            key={asset.token.symbol}
            className="grid grid-cols-1 md:grid-cols-5 gap-y-2 md:gap-4 p-4 items-center hover-elevate"
            data-testid={`row-asset-${asset.token.symbol}`}>
            <div className="flex justify-between items-center md:block">
                <span className="text-sm text-muted-foreground md:hidden">Asset</span>
                <div className="font-medium text-foreground">{displaySymbol}</div>
            </div>

            <div className="flex justify-between items-center md:block md:text-right">
                <span className="text-sm text-muted-foreground md:hidden">Available</span>
                <div className="font-mono">{asset.balanceFormatted}</div>
            </div>

            <div className="flex justify-between items-center md:block md:text-right">
                <span className="text-sm text-muted-foreground md:hidden">Price</span>
                <div className="font-mono">{asset.price ? formatUSD(asset.price) : '-'}</div>
            </div>

            <div className="flex justify-between items-center md:block md:text-right">
                <span className="text-sm text-muted-foreground md:hidden">Value (USD)</span>
                <div className="font-mono">{availableUSD}</div>
            </div>

            <div className="flex justify-between items-center mt-2 md:mt-0 md:block md:text-right">
                <span className="text-sm text-muted-foreground md:hidden">Actions</span>
                <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/assets/deposit?asset=${displaySymbol}`)}
                        data-testid={`button-deposit-${asset.token.symbol}`}
                        disabled={!asset.deposit_enabled}>
                        <FiDownload className="w-3 h-3 mr-1" />
                        Deposit
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/assets/transfer?asset=${displaySymbol}`)}
                        data-testid={`button-transfer-${asset.token.symbol}`}
                        disabled={!asset.withdraw_enabled} >
                        <FiSend className="w-3 h-3 mr-1" />
                        Transfer
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/assets/withdraw?asset=${displaySymbol}`)}
                        data-testid={`button-withdraw-${asset.token.symbol}`}
                        disabled={!asset.withdraw_enabled}>
                        <FiUpload className="w-3 h-3 mr-1" />
                        Withdraw
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default function Assets() {
    const { authenticated } = usePrivy();
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const { assets: allAssets, isLoading: assetsLoading, totalAssetsValue } = useVault();

    const displayAssets = useMemo(() => {
        return allAssets.filter(asset =>
            getDisplaySymbol(asset.token).toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, allAssets]);

    const isBaseAssetsPage = location.pathname === '/assets' || location.pathname === '/assets/';

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
            {isBaseAssetsPage ? (
                <div className="container mx-auto max-w-7xl">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-foreground">Assets</h1>
                        <LevelBadge />
                    </div>
                    <UserPoints />
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Total Asset Value</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-foreground">{formatUSD(totalAssetsValue)}</div>
                        </CardContent>
                    </Card>

                    {/* Deposit/Withdraw Card for Mobile */}
                    <Card className="mb-6 md:hidden">
                        <CardContent className="p-4 flex flex-wrap gap-4">
                            <Button className="flex-1" onClick={() => navigate('/assets/deposit')}>
                                <FiDownload className="w-4 h-4 mr-2" />
                                Deposit
                            </Button>
                            <Button className="flex-1" variant="outline" onClick={() => navigate('/assets/transfer')}>
                                <FiSend className="w-4 h-4 mr-2" />
                                Transfer
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
                            <div className="hidden md:grid grid-cols-5 gap-4 p-4 border-b border-border text-xs font-medium text-muted-foreground">
                                <div>Asset</div>
                                <div className="text-right">Available</div>
                                <div className="text-right">Price</div>
                                <div className="text-right">Value (USD)</div>
                                <div className="text-right">Actions</div>
                            </div>
                            <div className="divide-y divide-border">
                                {assetsLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 items-center">
                                            <Skeleton className="h-5 w-20" />
                                            <Skeleton className="h-5 w-24 ml-auto" />
                                            <Skeleton className="h-5 w-24 ml-auto" />
                                            <Skeleton className="h-5 w-24 ml-auto" />
                                            <Skeleton className="h-8 w-44 ml-auto" />
                                        </div>
                                    ))
                                ) : displayAssets && displayAssets.length > 0 ? (
                                    displayAssets.map((asset) => (
                                        <AssetRow key={asset.token.symbol} asset={asset} />
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
