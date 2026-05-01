
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
import { useVault } from "@/contexts/VaultContext";
import { getDisplaySymbolBySymbol, getAssetBySymbol } from "@/utils/tokenDisplay";
import { ChevronsUpDown } from 'lucide-react';
import { Button } from "./ui/button";

interface VaultAssetSelectorProps {
  asset: string;
  setAsset: (asset: string) => void;
  type: 'deposit' | 'withdraw';
}

export function VaultAssetSelector({ asset, setAsset, type }: VaultAssetSelectorProps) {
  const { assets, isLoading } = useVault();
  const [open, setOpen] = useState(false);

  const filteredAssets = useMemo(() => {
    if (isLoading) return [];
    return assets.filter(asset => {
      if (!asset || !asset.token) return false;
      if (type === 'deposit') return asset.deposit_enabled;
      if (type === 'withdraw') return asset.withdraw_enabled;
      return true;
    });
  }, [assets, type, isLoading]);

  const selectedAsset = useMemo(() => {
    if (!asset) return null;
    return getAssetBySymbol(filteredAssets, asset);
  }, [asset, filteredAssets]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isLoading || filteredAssets.length === 0}
        >
          {isLoading ? "Loading..." : selectedAsset ? getDisplaySymbolBySymbol(selectedAsset.token.symbol) : "Select asset"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search asset..." />
          <CommandList>
            <CommandEmpty>No asset found.</CommandEmpty>
            <CommandGroup>
              {filteredAssets.map((a) => (
                <CommandItem
                  key={a.token.symbol}
                  value={a.token.symbol}
                  onSelect={(currentValue) => {
                    setAsset(currentValue.toUpperCase());
                    setOpen(false);
                  }}
                >
                  {getDisplaySymbolBySymbol(a.token.symbol)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
