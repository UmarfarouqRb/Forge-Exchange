
import { useVault } from "@/contexts/VaultContext";
import { NewAssetSelector } from "./NewAssetSelector";
import { useMemo } from "react";

interface VaultAssetSelectorProps {
  asset: string;
  setAsset: (asset: string) => void;
  type: 'deposit' | 'withdraw';
}

export function VaultAssetSelector({ asset, setAsset, type }: VaultAssetSelectorProps) {
  const { tokens, isLoading } = useVault();

  const filteredAssets = useMemo(() => {
    return tokens
      .filter(token => {
        if (type === 'deposit') return token.deposit_enabled;
        if (type === 'withdraw') return token.withdraw_enabled;
        return true;
      })
      .map(token => ({ id: token.symbol, symbol: token.symbol }));
  }, [tokens, type]);

  return (
    <NewAssetSelector
      asset={asset}
      setAsset={setAsset}
      assets={filteredAssets}
    />
  );
}
