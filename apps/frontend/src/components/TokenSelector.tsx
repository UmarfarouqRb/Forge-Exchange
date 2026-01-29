import { useQuery } from '@tanstack/react-query';
import { getMarketData } from '@/lib/api';
import type { Market } from '@/types';

interface TokenSelectorProps {
  selectedToken: string;
  onSelectToken: (token: string) => void;
}

export function TokenSelector({ selectedToken, onSelectToken }: TokenSelectorProps) {
  const { data: marketData, isLoading } = useQuery<Market[]>({
    queryKey: ['marketData'],
    queryFn: getMarketData,
  });

  const tokens = marketData ? [...new Set(marketData.map(market => market.symbol))] : [];

  return (
    <div className="flex items-center space-x-2">
      {tokens.map((token) => {
        const market = marketData?.find(m => m.symbol === token);
        return (
          <button
            key={token}
            onClick={() => onSelectToken(token)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              selectedToken === token
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
            {token}
            {market && <span className="ml-2 text-xs">(${market.lastPrice})</span>}
          </button>
        );
      })}
    </div>
  );
}
