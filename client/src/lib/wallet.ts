import { ethers } from 'ethers';

export type WalletState = {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  balance: string | null;
};

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const connectWallet = async (): Promise<WalletState> => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    const network = await provider.getNetwork();
    const signer = await provider.getSigner();
    const balance = await provider.getBalance(accounts[0]);

    return {
      address: accounts[0],
      isConnected: true,
      chainId: Number(network.chainId),
      balance: ethers.formatEther(balance),
    };
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    throw error;
  }
};

export const disconnectWallet = (): WalletState => {
  return {
    address: null,
    isConnected: false,
    chainId: null,
    balance: null,
  };
};

export const formatAddress = (address: string): string => {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};
