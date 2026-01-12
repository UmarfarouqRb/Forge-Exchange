import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

const fetchTradeHistory = async (address: string) => {
  const response = await fetch(`/api/trades/${address}`);
  if (!response.ok) {
    throw new Error('Failed to fetch trade history');
  }
  return response.json();
};

export function useTradeHistory() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['tradeHistory', address],
    queryFn: () => fetchTradeHistory(address!),
    enabled: !!address,
  });
}
