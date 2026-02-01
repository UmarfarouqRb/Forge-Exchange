
import { useQuery } from '@tanstack/react-query';
import { getMarketBySymbol } from '@/lib/api';
import { Market } from '@/types';

export function useMarketData(symbol: string) {
  const { 
    data: marketData, 
    isLoading, 
    isError 
  } = useQuery<Market, Error>({
    queryKey: ['market-data', symbol],
    queryFn: () => getMarketBySymbol(symbol),
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 1000,       // Use cached data for 1 second before showing loading state
    enabled: !!symbol,     // Only run the query if a symbol is provided
  });

  return { marketData: marketData ?? null, isLoading, isError };
}
