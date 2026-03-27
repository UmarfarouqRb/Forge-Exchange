import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { getOrders } from '../lib/api';

export function useTradeHistory() {
  const { user, getAccessToken } = usePrivy();
  const walletAddress = user?.wallet?.address;

  const fetchTradeHistory = async () => {
    if (!walletAddress) {
      throw new Error("Wallet address not found");
    }
    const accessToken = await getAccessToken();
    if (!accessToken) {
        throw new Error("Not authenticated");
    }
    return getOrders(walletAddress, accessToken);
  };

  return useQuery({
    queryKey: ['tradeHistory', walletAddress],
    queryFn: fetchTradeHistory,
    enabled: !!walletAddress,
  });
}
