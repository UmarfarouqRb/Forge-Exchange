import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { apiRequest } from '@/lib/queryClient';

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
    // Generate a new session key when the component mounts
    const newSessionKey = ethers.Wallet.createRandom();
    setSessionKey(newSessionKey);
  }, []);

  const authorizeSession = async () => {
    if (!wallet.signer || !sessionKey) return;

    const expiration = Math.floor(Date.now() / 1000) + 86400; // 24 hours

    const typedData = {
        domain: {
            name: 'SessionKeyManager',
            version: '1',
            chainId: await wallet.signer.getChainId(),
            verifyingContract: '0x...', // Replace with your SessionKeyManager contract address
        },
        types: {
            Authorization: [
                { name: 'sessionKey', type: 'address' },
                { name: 'expiration', type: 'uint256' },
            ],
        },
        primaryType: 'Authorization',
        message: {
            sessionKey: sessionKey.address,
            expiration: expiration,
        },
    };

    try {
        const signature = await wallet.signer._signTypedData(typedData.domain, typedData.types, typedData.message);

        await apiRequest('POST', '/api/session/authorize', {
            sessionKey: sessionKey.address,
            expiration,
            signature,
        });

        setIsSessionAuthorized(true);
    } catch (error) {
        console.error('Failed to authorize session:', error);
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
