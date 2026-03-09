import { useState, useEffect } from 'react';
import { ChainContext, SUPPORTED_CHAINS, SupportedChain, SupportedChainId } from './chain-context';
import { useAccount, useSwitchChain } from 'wagmi';

export const ChainProvider = ({ children }: { children: React.ReactNode }) => {
  const { chain: connectedChain } = useAccount();
  const { switchChain } = useSwitchChain();

  const [selectedChain, setSelectedChain] = useState<SupportedChain>(SUPPORTED_CHAINS[0]);

  useEffect(() => {
    if (connectedChain) {
      const isSupported = SUPPORTED_CHAINS.some(chain => chain.id === connectedChain.id);
      if (isSupported) {
        setSelectedChain(connectedChain as SupportedChain);
      } else {
        switchChain?.({ chainId: SUPPORTED_CHAINS[0].id });
      }
    }
  }, [connectedChain, switchChain]);

  const handleSwitchChain = (chainId: SupportedChainId) => {
    switchChain?.({ chainId });
  };

  return (
    <ChainContext.Provider value={{ chains: SUPPORTED_CHAINS, selectedChain, switchChain: handleSwitchChain }}>
      {children}
    </ChainContext.Provider>
  );
};
