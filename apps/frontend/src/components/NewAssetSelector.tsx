
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
import { TOKENS } from "@/config/contracts";

type NewAssetSelectorProps = {
    isPairSelector?: false;
    asset: string | '';
    setAsset: (value: string | '') => void;
} | {
    isPairSelector: true;
    asset: string;
    setAsset: (value: string) => void;
};

export function NewAssetSelector(props: NewAssetSelectorProps) {
  const { tradingPairs, isLoading, isError } = useMarket();
  const [open, setOpen] = React.useState(false);

  // When isPairSelector is true, use the tradingPairs from the useMarket hook.
  // When isPairSelector is false, use the keys from the TOKENS object.
  const items: string[] = props.isPairSelector
    ? tradingPairs ?? []
    : Object.keys(TOKENS);

  const getDisplayValue = () => {
    if (props.isPairSelector) {
      return props.asset || "Select Pair";
    }
    return props.asset || "Select Asset";
  }

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
            {isLoading && <CommandEmpty>Loading...</CommandEmpty>}
            {isError && <CommandEmpty>Error loading assets.</CommandEmpty>}
            {!isLoading && !isError && items.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item}
                  value={item}
                  onSelect={() => {
                    props.setAsset(item);
                    setOpen(false);
                  }}
                >
                  {item}
                </CommandItem>              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
