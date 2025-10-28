import { createContext, useContext, useEffect, ReactNode } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';

export type WalletState = {
  address: string | null;
  isConnected: boolean;
  chainId: string | null;
  balance: string | null;
};

type WalletContextType = {
  wallet: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { toast } = useToast();

  const wallet: WalletState = {
    address: wallets[0]?.address || null,
    isConnected: authenticated && wallets.length > 0,
    chainId: wallets[0]?.chainId?.toString() || null,
    balance: null,
  };

  useEffect(() => {
    if (authenticated && wallets.length > 0) {
      const address = wallets[0].address;
      toast({
        title: 'Wallet Connected',
        description: `Connected to ${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
      });
    }
  }, [authenticated, wallets]);

  const connect = async () => {
    try {
      await login();
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect wallet',
        variant: 'destructive',
      });
    }
  };

  const disconnect = () => {
    logout();
    toast({
      title: 'Wallet Disconnected',
      description: 'Your wallet has been disconnected',
    });
  };

  return (
    <WalletContext.Provider value={{ wallet, connect, disconnect, isConnecting: !ready }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
