
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
import { useQuery } from "@tanstack/react-query";
import { getAllPairs } from "@/lib/api";
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
  const { data: allPairs, isLoading, isError } = useQuery({
    queryKey: ['all-pairs'],
    queryFn: getAllPairs,
  });
  const [open, setOpen] = React.useState(false);

  const getDisplayValue = () => {
    if (props.isPairSelector) {
      if (!props.asset || !allPairs) return "Select Pair";
      const selectedPair = allPairs.find(p => p.id === props.asset);
      return selectedPair?.symbol || "Select Pair";
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
            {!isLoading && !isError && (
                (props.isPairSelector && !allPairs?.length) ||
                (!props.isPairSelector && Object.keys(TOKENS).length === 0)
            ) && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            <CommandGroup>
              {props.isPairSelector ? (
                allPairs?.map((pair) => (
                  <CommandItem
                    key={pair.id}
                    value={pair.symbol}
                    onSelect={() => {
                      props.setAsset(pair.id);
                      setOpen(false);
                    }}
                  >
                    {pair.symbol}
                  </CommandItem>
                ))
              ) : (
                Object.keys(TOKENS).map((token) => (
                  <CommandItem
                    key={token}
                    value={token}
                    onSelect={() => {
                      if (!props.isPairSelector) {
                        props.setAsset(token);
                      }
                      setOpen(false);
                    }}
                  >
                    {token}
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
