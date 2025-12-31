import { useState, ReactNode, useEffect } from "react";
import { ChainContext, SUPPORTED_CHAINS, Chain } from "./chain-context"

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
      } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 4902) {
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
