
import { useState, useEffect, useMemo } from 'react';
import type { TradingPair } from '@/types';
import { TOKENS, INTENT_SPOT_ROUTER_ADDRESS, Token } from '@/config/contracts';

const QUOTE_CURRENCY: Token = 'USDT';

const STATIC_MOCK_DATA: Omit<TradingPair, 'id' | 'symbol' | 'baseAsset' | 'quoteAsset'> = {
  currentPrice: '3000',
  priceChange24h: '-1.5',
  high24h: '3100',
  low24h: '2900',
  volume24h: '1000000',
  isFavorite: false,
  category: 'Spot',
};

export function useMarketData() {
  const [tradingPairs, setTradingPairs] = useState<Map<string, TradingPair>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const baseTokens = useMemo(() => (Object.keys(TOKENS) as Token[]).filter(t => t !== QUOTE_CURRENCY), []);

  useEffect(() => {
    setIsLoading(true);
    const newTradingPairs = new Map<string, TradingPair>();

    baseTokens.forEach(tokenIn => {
      const pairSymbol = `${tokenIn}${QUOTE_CURRENCY}`;

      newTradingPairs.set(pairSymbol, {
        id: pairSymbol,
        symbol: pairSymbol,
        baseAsset: tokenIn,
        quoteAsset: QUOTE_CURRENCY,
        ...STATIC_MOCK_DATA,
      });
    });

    setTradingPairs(newTradingPairs);
    setIsLoading(false);
    setIsError(false);
  }, [baseTokens]);

  return { tradingPairs, isLoading, isError };
}
