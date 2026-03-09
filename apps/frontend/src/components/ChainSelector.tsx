import { useChainContext, SupportedChainId } from '@/contexts/chain-context';

export const ChainSelector = () => {
  const { chains, selectedChain, switchChain } = useChainContext();

  return (
    <div className="flex items-center space-x-2">
      <select
        value={selectedChain.id}
        onChange={(e) => switchChain(parseInt(e.target.value) as SupportedChainId)}
        className="p-2 border rounded"
      >
        {chains.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        ))}
      </select>
    </div>
  );
};