
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
import { TOKENS, Token } from "@/config/contracts";

export function NewAssetSelector({
  asset,
  setAsset,
  isPairSelector = false,
}: {
  asset: Token | string;
  setAsset: (asset: Token | string) => void;
  isPairSelector?: boolean;
}) {
  const { tradingPairs, isLoading, isError } = useMarket();
  const [open, setOpen] = React.useState(false);

  const items = isPairSelector
    ? tradingPairs instanceof Map
      ? Array.from(tradingPairs.keys())
      : []
    : (Object.keys(TOKENS) as Token[]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="text-lg md:text-2xl font-bold font-mono h-auto border-0 focus:ring-0 focus:ring-offset-0">
          {asset || (isPairSelector ? "Select Pair" : "Select Asset")}
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
              {items.map((item) => (
                <CommandItem
                  key={item}
                  value={item}
                  onSelect={(currentValue) => {
                    setAsset(currentValue);
                    setOpen(false);
                  }}
                >
                  {item}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
