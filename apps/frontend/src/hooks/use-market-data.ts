import { useState, useEffect, useMemo } from 'react';
import type { TradingPair } from '@/types';
import { TOKENS, INTENT_SPOT_ROUTER_ADDRESS, Token } from '@/config/contracts';
import { useReadContracts } from 'wagmi';
import { intentSpotRouterABI } from '@/abis/IntentSpotRouter';
import { parseUnits, formatUnits } from 'viem';

const QUOTE_CURRENCY: Token = 'USDC';

export function useMarketData() {
  const [tradingPairs, setTradingPairs] = useState<Map<string, TradingPair>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const baseTokens = useMemo(() => (Object.keys(TOKENS) as Token[]).filter(t => t !== QUOTE_CURRENCY), []);

  const priceQueries = useMemo(() => {
    return baseTokens.map(tokenIn => ({
      address: INTENT_SPOT_ROUTER_ADDRESS as `0x${string}`,
      abi: intentSpotRouterABI,
      functionName: 'getAmountOut',
      args: [TOKENS[tokenIn].address, TOKENS[QUOTE_CURRENCY].address, parseUnits('1', TOKENS[tokenIn].decimals)],
    }));
  }, [baseTokens]);

  const { data: prices, isInitialLoading, isError: isPricesError } = useReadContracts({
    contracts: priceQueries,
    query: {
      refetchInterval: 5000, // Refetch prices every 5 seconds
    }
  });

  useEffect(() => {
    if (isInitialLoading) {
      setIsLoading(true);
      return;
    }

    if (isPricesError) {
      setIsError(true);
      setIsLoading(false);
      return;
    }

    if (prices) {
      const newTradingPairs = new Map<string, TradingPair>();
      baseTokens.forEach((tokenIn, index) => {
        const priceData = prices[index];
        const pairSymbol = `${tokenIn}${QUOTE_CURRENCY}`;

        if (priceData.status === 'success') {
          const price = parseFloat(formatUnits(priceData.result as bigint, TOKENS[QUOTE_CURRENCY].decimals));
          const existingPair = tradingPairs.get(pairSymbol);

          newTradingPairs.set(pairSymbol, {
            id: pairSymbol, // Using pairSymbol as a unique ID
            symbol: pairSymbol,
            baseAsset: tokenIn,
            quoteAsset: QUOTE_CURRENCY,
            currentPrice: price.toString(),
            priceChange24h: existingPair?.priceChange24h || '0',
            high24h: existingPair?.high24h || price.toString(),
            low24h: existingPair?.low24h || price.toString(),
            volume24h: existingPair?.volume24h || '0',
            isFavorite: existingPair?.isFavorite || false,
            category: 'Spot',
          });
        }
      });

      setTradingPairs(newTradingPairs);
      setIsLoading(false);
      setIsError(false);
    }

  }, [prices, baseTokens, isInitialLoading, isPricesError, tradingPairs]);

  return { tradingPairs, isLoading, isError };
}
