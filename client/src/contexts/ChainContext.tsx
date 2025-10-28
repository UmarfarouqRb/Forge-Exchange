import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type Chain = {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
};

export const SUPPORTED_CHAINS: Chain[] = [
  {
    id: "base",
    name: "Base",
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    blockExplorerUrl: "https://basescan.org",
  },
  {
    id: "bnb",
    name: "BNB Chain",
    chainId: 56,
    rpcUrl: "https://bsc-dataseed.binance.org",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    blockExplorerUrl: "https://bscscan.com",
  },
  {
    id: "arb",
    name: "Arbitrum",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    blockExplorerUrl: "https://arbiscan.io",
  },
  {
    id: "sui",
    name: "SUI (Coming Soon)",
    chainId: 101,
    rpcUrl: "https://fullnode.mainnet.sui.io",
    nativeCurrency: {
      name: "SUI",
      symbol: "SUI",
      decimals: 9,
    },
    blockExplorerUrl: "https://explorer.sui.io",
  },
];

type ChainContextType = {
  selectedChain: Chain;
  setSelectedChain: (chain: Chain) => void;
  switchChain: (chainId: string) => Promise<void>;
};

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export function ChainProvider({ children }: { children: ReactNode }) {
  const [selectedChain, setSelectedChainState] = useState<Chain>(SUPPORTED_CHAINS[0]);

  useEffect(() => {
    const savedChainId = localStorage.getItem("selectedChainId");
    if (savedChainId) {
      const chain = SUPPORTED_CHAINS.find(c => c.id === savedChainId);
      if (chain) {
        setSelectedChainState(chain);
      }
    }
  }, []);

  const setSelectedChain = (chain: Chain) => {
    setSelectedChainState(chain);
    localStorage.setItem("selectedChainId", chain.id);
  };

  const switchChain = async (chainId: string) => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
    if (!chain) {
      throw new Error("Unsupported chain");
    }

    if (chain.id === 'sui') {
      throw new Error("SUI network support coming soon. Please use an EVM-compatible chain.");
    }

    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chain.chainId.toString(16)}` }],
        });
        setSelectedChain(chain);
      } catch (error: any) {
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${chain.chainId.toString(16)}`,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: [chain.rpcUrl],
                blockExplorerUrls: [chain.blockExplorerUrl],
              }],
            });
            setSelectedChain(chain);
          } catch (addError) {
            throw new Error("Failed to add chain");
          }
        } else {
          throw error;
        }
      }
    } else {
      setSelectedChain(chain);
    }
  };

  return (
    <ChainContext.Provider value={{ selectedChain, setSelectedChain, switchChain }}>
      {children}
    </ChainContext.Provider>
  );
}

export const useChain = () => {
  const context = useContext(ChainContext);
  if (context === undefined) {
    throw new Error("useChain must be used within a ChainProvider");
  }
  return context;
};
