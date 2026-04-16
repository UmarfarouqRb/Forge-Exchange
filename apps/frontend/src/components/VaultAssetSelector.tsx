import { useVault } from "@/contexts/VaultContext";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
    return assets
      .filter(asset => {
        if (!asset || !asset.token) return false;
        if (type === 'deposit') return asset.deposit_enabled;
        if (type === 'withdraw') return asset.withdraw_enabled;
        return true;
      })
      .map(asset => ({ 
        value: asset.token.symbol,
        label: asset.token.symbol === 'WETH' ? 'ETH' : asset.token.symbol
      }));
  }, [assets, type, isLoading]);

  const selectedAsset = useMemo(() => {
    if (!asset) return null;
    return filteredAssets.find(a => a.value === asset || a.label === asset) || null;
  }, [asset, filteredAssets]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isLoading || filteredAssets.length === 0}
        >
          {isLoading ? "Loading..." : selectedAsset ? selectedAsset.label : "Select asset"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search asset..." />
          <CommandEmpty>No asset found.</CommandEmpty>
          <CommandGroup>
            {filteredAssets.map((a) => (
              <CommandItem
                key={a.value}
                value={a.value}
                onSelect={(currentValue) => {
                  setAsset(currentValue === selectedAsset?.value ? "" : currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedAsset?.value === a.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {a.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
