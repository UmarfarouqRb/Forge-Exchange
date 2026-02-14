
import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TradingPair } from "@/types/market-data";

interface NewAssetSelectorProps {
    pairsList: TradingPair[];
    selectedTradingPair: TradingPair | undefined;
    setSelectedTradingPair: (pair: TradingPair) => void;
}

export function NewAssetSelector({ pairsList, selectedTradingPair, setSelectedTradingPair }: NewAssetSelectorProps) {
  const [open, setOpen] = useState(false);

  const getDisplayValue = () => {
    if (!selectedTradingPair) return "Select Asset";
    return selectedTradingPair.symbol;
  };

  return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button className="text-lg md:text-2xl font-bold font-mono h-auto border-0 focus:ring-0 focus:ring-offset-0">
            {getDisplayValue()}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full">
          <Command>
            <CommandInput placeholder="Search for an asset..." />
            <CommandList>
              {pairsList.length === 0 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
              <CommandGroup>
                {pairsList.map((pair: TradingPair) => (
                  <CommandItem
                    key={pair.id}
                    value={pair.symbol}
                    onSelect={() => {
                      setSelectedTradingPair(pair);
                      setOpen(false);
                    }}
                  >
                    {pair.symbol}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DropdownMenuContent>
      </DropdownMenu>
  );
}
