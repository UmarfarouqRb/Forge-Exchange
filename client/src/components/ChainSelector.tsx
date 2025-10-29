import { useChain, SUPPORTED_CHAINS } from "@/contexts/ChainContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export function ChainSelector() {
  const { selectedChain, switchChain, setSelectedChain } = useChain();
  const { toast } = useToast();

  const handleChainChange = async (chainId: string) => {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
    
    if (chainId === 'sui') {
      setSelectedChain(chain!);
      toast({
        title: "Coming Soon",
        description: "SUI network support is coming soon. Currently only EVM-compatible chains are supported.",
        variant: "default",
      });
      return;
    }

    try {
      await switchChain(chainId);
      toast({
        title: "Chain Switched",
        description: `Switched to ${chain?.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Switch Chain",
        description: error.message || "Could not switch to the selected chain",
        variant: "destructive",
      });
    }
  };

  return (
    <Select value={selectedChain.id} onValueChange={handleChainChange}>
      <SelectTrigger 
        className="w-[100px] sm:w-[120px] md:w-[140px] bg-card border-border hover:bg-accent text-xs sm:text-sm" 
        data-testid="select-chain"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-w-[200px]">
        {SUPPORTED_CHAINS.map((chain) => (
          <SelectItem 
            key={chain.id} 
            value={chain.id}
            data-testid={`select-chain-${chain.id}`}
            className="text-xs sm:text-sm"
          >
            {chain.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
