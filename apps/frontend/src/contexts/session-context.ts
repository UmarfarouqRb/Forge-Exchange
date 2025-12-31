import { createContext } from 'react';
import { ethers } from 'ethers';

interface SessionContextType {
  sessionKey: ethers.Wallet | null;
  isSessionAuthorized: boolean;
  authorizeSession: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined);
