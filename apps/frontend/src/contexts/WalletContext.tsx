import { useEffect, ReactNode, useState, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import { ethers } from 'ethers';
import { WalletContext, WalletState } from './wallet-context';
export function WalletProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { toast } = useToast();

  const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === 'privy');

  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    chainId: null,
    balance: null,
    signer: null,
  });

  const getSigner = useCallback(async () => {
    if (!embeddedWallet) return null;
    await embeddedWallet.switchChain(1);
    const provider = await embeddedWallet.getEthereumProvider();
    
    return new ethers.BrowserProvider(provider).getSigner();
  }, [embeddedWallet]);

  useEffect(() => {
    const updateUserWallet = async () => {
      const isConnected = authenticated && !!embeddedWallet;
      if (ready && isConnected) {
        const address = embeddedWallet.address;
        const signer = await getSigner();
        setWallet({
          address: address,
          isConnected: true,
          chainId: embeddedWallet.chainId.toString(),
          balance: null, // or fetch balance
          signer: signer,
        });

        toast({
          title: 'Wallet Connected',
          description: `Connected to ${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
        });
      } else if (ready && !authenticated) {
        setWallet({
            address: null,
            isConnected: false,
            chainId: null,
            balance: null,
            signer: null,
        });
      }
    };

    updateUserWallet();
  }, [ready, authenticated, embeddedWallet, getSigner, toast]);


  const connect = async () => {
    try {
      await login();
    } catch (error: unknown) {
      let errorMessage = 'Failed to connect wallet';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: 'Connection Failed',
        description: errorMessage,
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
