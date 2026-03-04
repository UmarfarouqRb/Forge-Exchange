
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
        if (type === 'deposit') return asset.deposit_enabled;
        if (type === 'withdraw') return asset.withdraw_enabled;
        return true;
      })
      .map(asset => ({ 
        value: asset.displayToken.symbol.toLowerCase(), 
        label: asset.displayToken.symbol 
      }));
  }, [assets, type, isLoading]);

  const selectedAssetLabel = asset
    ? filteredAssets.find(a => a.label.toLowerCase() === asset.toLowerCase())?.label
    : "Select asset";

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
          {isLoading ? "Loading..." : selectedAssetLabel}
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
                  const selected = filteredAssets.find(f => f.value === currentValue);
                  setAsset(selected ? selected.label : "");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    asset.toLowerCase() === a.value ? "opacity-100" : "opacity-0"
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
