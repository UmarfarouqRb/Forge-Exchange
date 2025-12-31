import { createContext } from "react";

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


export const ChainContext = createContext<ChainContextType | undefined>(undefined);
