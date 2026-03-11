
import { useChainContext, SupportedChainId } from '@/contexts/chain-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FiChevronDown } from 'react-icons/fi';

export const ChainSelector = () => {
  const { chains, selectedChain, switchChain } = useChainContext();

  // Return null if there are no chains to select
  if (chains.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <span>{selectedChain.name}</span>
          <FiChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {chains.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => switchChain(chain.id as SupportedChainId)}
            disabled={chain.id === selectedChain.id}
          >
            {chain.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
