
import * as React from "react";
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
import { useMarket } from "@/hooks/use-market";

export function AssetSelector({
  selectedPair,
  setSelectedPair,
}: {
  selectedPair: string;
  setSelectedPair: (pair: string) => void;
}) {
  const { tradingPairs, isLoading, isError } = useMarket();
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="text-lg md:text-2xl font-bold font-mono h-auto border-0 focus:ring-0 focus:ring-offset-0">
          {selectedPair}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full">
        <Command>
          <CommandInput placeholder="Search for an asset..." />
          <CommandList>
            {isLoading && <CommandEmpty>Loading...</CommandEmpty>}
            {isError && <CommandEmpty>Error loading assets.</CommandEmpty>}
            {!isLoading && !isError && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            <CommandGroup>
              {tradingPairs instanceof Map &&
                Array.from(tradingPairs.keys()).map((pair) => (
                  <CommandItem
                    key={pair}
                    value={pair}
                    onSelect={(currentValue) => {
                      setSelectedPair(currentValue);
                      setOpen(false);
                    }}
                  >
                    {pair}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
