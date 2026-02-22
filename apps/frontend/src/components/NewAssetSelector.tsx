
import { useState, useMemo } from "react";
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
import { Star } from "lucide-react";

interface NewAssetSelectorProps {
    pairsList: TradingPair[];
    selectedTradingPair: TradingPair | undefined;
    setSelectedTradingPair: (pair: TradingPair) => void;
}

export function NewAssetSelector({ pairsList, selectedTradingPair, setSelectedTradingPair }: NewAssetSelectorProps) {
  const [open, setOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  const toggleFavorite = (pairSymbol: string) => {
    setFavorites(prev => 
      prev.includes(pairSymbol) 
        ? prev.filter(p => p !== pairSymbol)
        : [...prev, pairSymbol]
    );
  };

  const favoritePairs = useMemo(() => 
    pairsList.filter(p => favorites.includes(p.symbol)),
    [pairsList, favorites]
  );

  const otherPairs = useMemo(() =>
    pairsList.filter(p => !favorites.includes(p.symbol)),
    [pairsList, favorites]
  );

  const renderPair = (pair: TradingPair) => (
    <CommandItem
      key={pair.id}
      value={pair.symbol}
      onSelect={() => {
        setSelectedTradingPair(pair);
        setOpen(false);
      }}
      className="flex justify-between items-center"
    >
      <span>{pair.symbol}</span>
      <Star 
        className={`w-4 h-4 cursor-pointer ${favorites.includes(pair.symbol) ? 'fill-yellow-400 text-yellow-500' : 'text-gray-400'}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(pair.symbol);
        }}
      />
    </CommandItem>
  );
  
  return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button className="text-lg md:text-2xl font-bold font-mono h-auto border-0 focus:ring-0 focus:ring-offset-0 flex items-center gap-2 bg-white/10 text-white p-2 rounded-md">
            <span>{selectedTradingPair ? selectedTradingPair.symbol : "Select Asset"}</span>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-50"><path d="M4.18179 6.18181C4.35753 6.00608 4.64245 6.00608 4.81819 6.18181L7.49999 8.86362L10.1818 6.18181C10.3575 6.00608 10.6424 6.00608 10.8182 6.18181C10.9939 6.35755 10.9939 6.64247 10.8182 6.81821L7.81819 9.81821C7.64245 9.99394 7.35753 9.99394 7.18179 9.81821L4.18179 6.81821C4.00606 6.64247 4.00606 6.35755 4.18179 6.18181Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[300px] bg-white/10" align="start">
          <Command>
            <CommandInput placeholder="Search assets..." />
            <CommandList>
              {pairsList.length === 0 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
              {favoritePairs.length > 0 && (
                <CommandGroup heading="Favorites">
                  {favoritePairs.map(renderPair)}
                </CommandGroup>
              )}
              <CommandGroup heading="All Assets">
                {otherPairs.map(renderPair)}
              </CommandGroup>
            </CommandList>
          </Command>
        </DropdownMenuContent>
      </DropdownMenu>
  );
}
