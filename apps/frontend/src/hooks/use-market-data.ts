
import { useState, useEffect, useMemo } from 'react';
import type { TradingPair } from '@/types';
import { TOKENS, INTENT_SPOT_ROUTER_ADDRESS, Token } from '@/config/contracts';
import { useAccount, useReadContracts } from 'wagmi';
import { intentSpotRouterABI } from '@/abis/IntentSpotRouter';
import { parseUnits, formatUnits } from 'viem';

const QUOTE_CURRENCY: Token = 'USDT';

export function useMarketData() {
  const { chain } = useAccount();
  const [tradingPairs, setTradingPairs] = useState<Map<string, TradingPair>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const baseTokens = useMemo(() => (Object.keys(TOKENS) as Token[]).filter(t => t !== QUOTE_CURRENCY), []);

  const intentSpotRouterAddress = useMemo(() => {
    if (!chain || !INTENT_SPOT_ROUTER_ADDRESS[chain.id]) {
      return undefined;
    }
    return INTENT_SPOT_ROUTER_ADDRESS[chain.id];
  }, [chain]);

  const priceQueries = useMemo(() => {
    if (!intentSpotRouterAddress) {
      return [];
    }
    return baseTokens.map(tokenIn => ({
      address: intentSpotRouterAddress,
      abi: intentSpotRouterABI,
      functionName: 'getAmountOut',
      args: [TOKENS[tokenIn].address, TOKENS[QUOTE_CURRENCY].address, parseUnits('1', TOKENS[tokenIn].decimals)],
    }));
  }, [baseTokens, intentSpotRouterAddress]);

  const { data: prices, isInitialLoading, isError: isPricesError, refetch } = useReadContracts({
    contracts: priceQueries,
    query: {
      enabled: !!intentSpotRouterAddress,
      refetchInterval: 5000,
    }
  });

  useEffect(() => {
    refetch();
  }, [chain, refetch]);

  useEffect(() => {
    if (isInitialLoading) {
      setIsLoading(true);
      return;
    }

    if (isPricesError || !intentSpotRouterAddress) {
      setIsError(true);
      setIsLoading(false);
      setTradingPairs(new Map());
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
            id: pairSymbol,
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
    } else {
      setTradingPairs(new Map());
    }
  }, [prices, baseTokens, isInitialLoading, isPricesError, tradingPairs, intentSpotRouterAddress]);

  return { tradingPairs, isLoading, isError };
}
