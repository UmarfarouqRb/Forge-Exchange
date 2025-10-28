import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { formatAddress } from '@/lib/wallet';
import {
  FiHome,
  FiTrendingUp,
  FiActivity,
  FiPieChart,
  FiFolder,
  FiLogOut,
} from 'react-icons/fi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { path: '/', label: 'Home', icon: FiHome },
  { path: '/market', label: 'Market', icon: FiTrendingUp },
  { path: '/spot', label: 'Spot', icon: FiActivity },
  { path: '/futures', label: 'Futures', icon: FiPieChart },
  { path: '/assets', label: 'Assets', icon: FiFolder },
];

export function Navigation() {
  const [location] = useLocation();
  const { wallet, connect, disconnect, isConnecting } = useWallet();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/">
            <a className="flex items-center gap-2 hover-elevate px-3 py-2 rounded-md" data-testid="link-home-logo">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">D</span>
              </div>
              <span className="text-xl font-bold text-foreground">DexExchange</span>
            </a>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={isActive ? 'bg-accent text-accent-foreground' : ''}
                      data-testid={`link-nav-${item.label.toLowerCase()}`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Button>
                  </a>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="flex items-center gap-4">
          {wallet.isConnected ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" data-testid="button-wallet-connected">
                  <span className="font-mono">{formatAddress(wallet.address!)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-xs text-muted-foreground">
                  <span className="font-mono">{wallet.address}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs text-muted-foreground">
                  Balance: {wallet.balance ? parseFloat(wallet.balance).toFixed(4) : '0.0000'} ETH
                </DropdownMenuItem>
                <DropdownMenuItem onClick={disconnect} data-testid="button-wallet-disconnect">
                  <FiLogOut className="w-4 h-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="default"
              onClick={connect}
              disabled={isConnecting}
              data-testid="button-wallet-connect"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-border">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <a>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex-col h-auto py-2 ${isActive ? 'bg-accent text-accent-foreground' : ''}`}
                    data-testid={`link-mobile-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                </a>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
