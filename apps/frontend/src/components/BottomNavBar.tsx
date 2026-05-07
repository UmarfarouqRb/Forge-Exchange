import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  FiHome,
  FiTrendingUp,
  FiActivity,
  FiPieChart,
  FiFolder,
  FiDatabase,
} from 'react-icons/fi';

const navItems = [
  { path: '/', label: 'Home', icon: FiHome },
  { path: '/market', label: 'Market', icon: FiTrendingUp },
  { path: '/spot', label: 'Spot', icon: FiActivity },
  { path: '/futures', label: 'Futures', icon: FiPieChart },
  { path: '/staking', label: 'Staking', icon: FiDatabase },
  { path: '/assets', label: 'Assets', icon: FiFolder },
];

export function BottomNavBar() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'flex-col h-auto py-2 leading-none',
                (pathname.startsWith(item.path) && item.path !== '/') || pathname === item.path ? 'bg-accent text-accent-foreground' : ''
              )}
              data-testid={`link-mobile-${item.label.toLowerCase()}`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
