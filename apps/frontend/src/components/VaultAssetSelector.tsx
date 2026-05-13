
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
import { getDisplaySymbolBySymbol, getAssetBySymbol, getDisplaySymbol } from "@/utils/tokenDisplay";
import { ChevronsUpDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { VaultAsset } from "@/types/market-data";

interface VaultAssetSelectorProps {
  asset: string;
  setAsset: (asset: string) => void;
  type: 'deposit' | 'withdraw';
}

const AssetDisplay = ({ asset, isSelected }: { asset: VaultAsset, isSelected: boolean }) => (
    <div className="flex items-center w-full">
        <img src={`/tokens/${asset.token.symbol}.svg`} alt={asset.token.name} className="w-6 h-6 rounded-full mr-2" />
        <div className="flex-grow">
            <div className="font-medium">{getDisplaySymbol(asset.token)}</div>
            {isSelected && <div className="text-xs text-muted-foreground">{asset.token.name}</div>}
        </div>
        <div className="text-right">
            <div className="font-mono">{asset.balanceFormatted}</div>
        </div>
    </div>
);

export function VaultAssetSelector({ asset, setAsset, type }: VaultAssetSelectorProps) {
  const { assets, isLoading } = useVault();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = useMemo(() => {
    if (isLoading) return [];
    return assets.filter(asset => {
      if (!asset || !asset.token) return false;

      const symbol = getDisplaySymbol(asset.token).toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = symbol.includes(query);

      if (type === 'deposit') return asset.deposit_enabled && matchesSearch;
      if (type === 'withdraw') return asset.withdraw_enabled && matchesSearch;
      
      return matchesSearch;
    });
  }, [assets, type, isLoading, searchQuery]);

  const selectedAsset = useMemo(() => {
    if (!asset) return null;
    // we need to search through all assets, not just the filtered ones
    return getAssetBySymbol(assets, asset);
  }, [asset, assets]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-14"
          disabled={isLoading || assets.length === 0}
        >
          {isLoading && "Loading..."}
          {!isLoading && selectedAsset && <AssetDisplay asset={selectedAsset} isSelected={true} />}
          {!isLoading && !selectedAsset && "Select asset"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder="Search asset..." 
            value={searchQuery} 
            onValueChange={setSearchQuery} 
          />
          <CommandList>
            <CommandEmpty>No asset found.</CommandEmpty>
            <CommandGroup>
              {filteredAssets.map((a) => (
                <CommandItem
                  key={a.token.symbol}
                  value={getDisplaySymbol(a.token)}
                  onSelect={(currentValue) => {
                    const selectedSymbol = currentValue.toUpperCase() === 'ETH' ? 'WETH' : currentValue.toUpperCase();
                    setAsset(selectedSymbol);
                    setOpen(false);
                  }}
                >
                    <AssetDisplay asset={a} isSelected={false} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
