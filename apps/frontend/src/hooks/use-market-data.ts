import { useState, useEffect } from 'react';
import type { TradingPair } from '@/types';

const WEBSOCKET_URL = (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host;

export function useMarketData() {
  const [tradingPairs, setTradingPairs] = useState<Map<string, TradingPair>>(new Map());

  useEffect(() => {
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'allPairs') {
        const pairsMap = new Map<string, TradingPair>();
        message.data.forEach((pair: TradingPair) => {
          pairsMap.set(pair.symbol, pair);
        });
        setTradingPairs(pairsMap);
      } else if (message.type === 'priceUpdate') {
        setTradingPairs((prevPairs) => {
          const newPairs = new Map(prevPairs);
          newPairs.set(message.data.symbol, message.data);
          return newPairs;
        });
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = () => {
      console.error('WebSocket connection to ' + WEBSOCKET_URL + ' failed. Please check if the server is running and the URL is correct.');
    };

    return () => {
      ws.close();
    };
  }, []);

  return { tradingPairs };
}
