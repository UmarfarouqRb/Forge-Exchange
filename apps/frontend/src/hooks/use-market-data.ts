
import { useState, useEffect } from 'react';
import type { TradingPair } from '@/types/trading-pair';
import { getMarketData } from '@/lib/api';

export function useMarketData() {
  const [tradingPairs, setTradingPairs] = useState<Map<string, TradingPair>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const data = await getMarketData();
        const newTradingPairs = new Map<string, TradingPair>();
        data.forEach((pair: TradingPair) => {
          newTradingPairs.set(pair.symbol, {
            ...pair,
            currentPrice: pair.price ?? '0',
          });
        });
        setTradingPairs(newTradingPairs);
        setIsError(false);
      } catch (error) {
        console.error("Failed to fetch market data:", error);
        setIsError(true);
      } finally {
        if (isLoading) {
          setIsLoading(false);
        }
      }
    };

    fetchMarketData();
    const intervalId = setInterval(fetchMarketData, 5000); // Refresh data every 5 seconds

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, [isLoading]);

  return { tradingPairs, isLoading, isError };
}
