import { useQuery } from "@tanstack/react-query";
import { getAllTradingPairs } from "@/lib/api";

export function useMarket() {
    const { data: tradingPairs, isLoading, isError } = useQuery<string[]>({
        queryKey: ['trading-pairs'],
        queryFn: getAllTradingPairs,
    });

    return { tradingPairs, isLoading, isError };
}