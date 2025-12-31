import { createContext, useContext } from 'react';
import { ethers } from 'ethers';

export type WalletState = {
  address: string | null;
  isConnected: boolean;
  chainId: string | null;
  balance: string | null;
  signer: ethers.Signer | null;
};

type WalletContextType = {
  wallet: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
};

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};
