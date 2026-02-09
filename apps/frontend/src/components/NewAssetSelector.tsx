
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

// We define a generic Asset type that can represent either a TradingPair or a Token.
// This makes the component more flexible and reusable.
type Asset = {
  id: string;
  symbol: string;
};

type NewAssetSelectorProps = {
  asset: string; // Now represents the ID of the selected asset
  setAsset: (value: string) => void;
  assets: Asset[];
  isLoading: boolean;
  isError: boolean;
};

export function NewAssetSelector(props: NewAssetSelectorProps) {
  const { asset, setAsset, assets, isLoading, isError } = props;
  const [open, setOpen] = React.useState(false);

  const getDisplayValue = () => {
    if (!asset || assets.length === 0) return "Select Asset";
    const selectedAsset = assets.find(a => a.id === asset);
    return selectedAsset?.symbol || "Select Asset";
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
            {isLoading && <CommandEmpty>Loading...</CommandEmpty>}
            {isError && <CommandEmpty>Error loading assets.</CommandEmpty>}
            {!isLoading && !isError && assets.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            <CommandGroup>
              {assets.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.symbol}
                  onSelect={() => {
                    setAsset(item.id);
                    setOpen(false);
                  }}
                >
                  {item.symbol}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
