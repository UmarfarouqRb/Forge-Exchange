
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

type NewAssetSelectorProps = {
    isPairSelector?: false;
    asset: Token | '';
    setAsset: (value: Token | '') => void;
} | {
    isPairSelector: true;
    asset: string;
    setAsset: (value: string) => void;
};

export function NewAssetSelector(props: NewAssetSelectorProps) {
  const { isPairSelector } = props;
  const { tradingPairs, isLoading, isError } = useMarket();
  const [open, setOpen] = React.useState(false);

  const items = props.isPairSelector
    ? tradingPairs instanceof Map
      ? Array.from(tradingPairs.keys())
      : []
    : (Object.keys(TOKENS) as Token[]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="text-lg md:text-2xl font-bold font-mono h-auto border-0 focus:ring-0 focus:ring-offset-0">
          {props.asset || (props.isPairSelector ? "Select Pair" : "Select Asset")}
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
                    if (props.isPairSelector) {
                      props.setAsset(currentValue);
                    } else {
                      props.setAsset(currentValue.toUpperCase() as Token);
                    }
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
