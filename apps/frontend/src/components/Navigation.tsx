import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import { formatAddress, cn } from '@/lib/utils';
import { ChainSelector } from '@/components/ChainSelector';
import { useToast } from '@/hooks/use-toast';
import {
  FiHome,
  FiTrendingUp,
  FiActivity,
  FiPieChart,
  FiFolder,
  FiLogOut,
  FiSettings,
  FiLoader,
  FiCopy,
  FiBookOpen
} from 'react-icons/fi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { path: '/', label: 'Home', icon: FiHome },
  { path: '/market', label: 'Market', icon: FiTrendingUp },
  { path: '/spot', label: 'Spot', icon: FiActivity },
  { path: '/futures', label: 'Futures', icon: FiPieChart },
  { path: '/assets', label: 'Assets', icon: FiFolder },
  { path: '/docs', label: 'Docs', icon: FiBookOpen },
];

export function Navigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { ready, authenticated, user, login, logout } = usePrivy();
  const wallet = user?.wallet;
  const { toast } = useToast();

  const copyToClipboard = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      toast({ title: 'Copied!', description: 'Wallet address copied to clipboard.' });
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="flex items-center justify-between h-16 pl-0 pr-6">
        <div className="flex items-center gap-0 md:gap-4">
          <NavLink to="/" className="flex items-center gap-1 hover-elevate px-2 md:px-3 py-2 rounded-md" data-testid="link-home-logo">
            <img src="/assets/1761614392004_1761638995733.jpg" alt="Forge Logo" className="w-14 h-14 md:w-16 md:h-16 object-contain dark:hidden"/>
            <img src="/assets/1761614576584_1761638995664.jpg" alt="Forge Logo" className="w-14 h-14 md:w-16 md:h-16 object-contain hidden dark:block"/>
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-[hsl(27,87%,61%)] to-[hsl(214,66%,54%)] bg-clip-text text-transparent">Forge</span>
          </NavLink>
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button asChild variant="ghost" size="sm" key={item.path}>
                  <NavLink
                    to={item.path}
                    className={cn(
                      'w-full flex items-center justify-center md:justify-start',
                      pathname === item.path && 'bg-accent text-accent-foreground'
                    )}
                    data-testid={`link-nav-${item.label.toLowerCase()}`}>
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </NavLink>
                </Button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <ChainSelector />
          {!ready ? (
            <Button variant="outline" size="sm" disabled className="text-xs md:text-sm">
              <FiLoader className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </Button>
          ) : authenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="text-xs md:text-sm font-mono" data-testid="button-wallet-connected">
                  {wallet?.address ? formatAddress(wallet.address) : 'Connected'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-mono truncate">{wallet?.address}</span>
                    <Button variant="ghost" size="icon" onClick={copyToClipboard} className="h-8 w-8">
                      <FiCopy className="h-4 w-4" />
                    </Button>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/portfolio')}>
                  <FiFolder className="w-4 h-4 mr-2" />
                  Portfolio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <FiSettings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="button-wallet-disconnect" className="text-red-500 focus:text-red-500">
                  <FiLogOut className="w-4 h-4 mr-2" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="default" size="sm" onClick={login} className="text-xs md:text-sm px-2 md:px-4" data-testid="button-wallet-connect">
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
      <div className="md:hidden border-t border-border">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button asChild variant="ghost" size="sm" key={item.path} className="flex-col h-auto py-2 leading-none">
                 <NavLink
                    to={item.path}
                    className={cn(
                      'w-full flex flex-col items-center justify-center h-auto py-2 leading-none',
                      pathname === item.path && 'bg-accent text-accent-foreground'
                    )}
                    data-testid={`link-mobile-${item.label.toLowerCase()}`}>
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs">{item.label}</span>
                </NavLink>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
