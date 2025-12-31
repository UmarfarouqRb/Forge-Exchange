import { useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/use-wallet';
import { authorizeSession as apiAuthorizeSession } from '@/lib/api';
import { SessionContext } from './session-context';

export function SessionProvider({ children }: { children: ReactNode }) {
  const { wallet } = useWallet();
  const [sessionKey, setSessionKey] = useState<ethers.Wallet | null>(null);
  const [isSessionAuthorized, setIsSessionAuthorized] = useState(false);

  useEffect(() => {
    const newSessionKey = new ethers.Wallet(ethers.Wallet.createRandom().privateKey);
    setSessionKey(newSessionKey);
  }, []);

  const authorizeSession = async () => {
    if (!wallet.signer || !sessionKey) return;

    try {
      await apiAuthorizeSession(sessionKey, wallet.signer as ethers.Signer);
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
