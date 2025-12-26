import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { authorizeSession as apiAuthorizeSession } from '@/lib/api';

interface SessionContextType {
  sessionKey: ethers.Wallet | null;
  isSessionAuthorized: boolean;
  authorizeSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { wallet } = useWallet();
  const [sessionKey, setSessionKey] = useState<ethers.Wallet | null>(null);
  const [isSessionAuthorized, setIsSessionAuthorized] = useState(false);

  useEffect(() => {
    const newSessionKey = ethers.Wallet.createRandom();
    setSessionKey(newSessionKey);
  }, []);

  const authorizeSession = async () => {
    if (!wallet.signer || !sessionKey) return;

    try {
      await apiAuthorizeSession(sessionKey, wallet.signer);
      setIsSessionAuthorized(true);
    } catch (error) {
      console.error('Failed to authorize session:', error);
      setIsSessionAuthorized(false);
    }
  };

  return (
    <SessionContext.Provider value={{ sessionKey, isSessionAuthorized, authorizeSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
