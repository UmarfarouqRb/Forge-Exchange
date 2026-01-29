import { apiRequest } from './queryClient';
import type { Order, Market, TradingPair, OrderBook } from '../types/index';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://forge-exchange-api.onrender.com'
  : 'http://localhost:3001';

const checkApiConfig = () => {
  if (!API_BASE_URL) {
    const errorMessage = "API service URL is not configured. The application cannot function without this.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

export const getMarketData = async (): Promise<TradingPair[]> => {
    checkApiConfig();
    try {
        const response = await fetch(`${API_BASE_URL}/api/trading-pairs`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error: Failed to fetch market data. Status: ${response.status}. Message: ${errorText}`);
            return [];
        }
        return response.json();
    } catch (error) {
        console.error("Network or API Error: Could not fetch market data. Please ensure the API services are running and accessible.", error);
        return [];
    }
};

export const getMarket = async (pair: string): Promise<Market | null> => {
    checkApiConfig();
    try {
        const response = await fetch(`${API_BASE_URL}/api/markets/${pair}`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error: Failed to fetch market data for pair ${pair}. Status: ${response.status}. Message: ${errorText}`);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error(`Network or API Error: Could not fetch market data for pair ${pair}. Please ensure the API services are running and accessible.`, error);
        return null;
    }
};

export const getTrendingPairs = async (): Promise<Market[]> => {
    checkApiConfig();
    try {
        const response = await fetch(`${API_BASE_URL}/api/trading-pairs/trending`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error: Failed to fetch trending pairs. Status: ${response.status}. Message: ${errorText}`);
            return [];
        }
        return response.json();
    } catch (error) {
        console.error("Network or API Error: Could not fetch trending pairs. Please ensure the API services are running and accessible.", error);
        return [];
    }
};

export const getOrderBook = async (pair: string): Promise<OrderBook> => {
    const marketData = await getMarket(pair);
    if (marketData) {
        return { bids: marketData.bids, asks: marketData.asks };
    }
    return { bids: [], asks: [] };
};

export const getOrders = async (address: string | undefined): Promise<Order[]> => {
  if (!address) return [];
  checkApiConfig();
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/${address}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: Failed to fetch orders for address ${address}. Status: ${response.status}. Message: ${errorText}`);
      throw new Error('Failed to fetch orders');
    }
    return response.json();
  } catch (error) {
    console.error("Network or API Error: Could not fetch orders. Please ensure the API services are running and accessible.", error);
    throw error;
  }
};

export const getTokens = async (chainId: string): Promise<{ [symbol: string]: { address: `0x${string}`; decimals: number } }> => {
    checkApiConfig();
    try {
        const response = await fetch(`${API_BASE_URL}/api/tokens?chainId=${chainId}`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error: Failed to fetch tokens for chainId ${chainId}. Status: ${response.status}. Message: ${errorText}`);
            return {};
        }
        return response.json();
    } catch (error) {
        console.error(`Network or API Error: Could not fetch tokens for chainId ${chainId}. Please ensure the API services are running and accessible.`, error);
        return {};
    }
};

export type PlaceOrderPayload = {
  intent: {
    user: string;
    tokenIn: `0x${string}`;
    tokenOut: `0x${string}`;
    amountIn: string;
    minAmountOut: string;
    deadline: number;
    nonce: string;
    adapter: `0x${string}`;
    relayerFee: string;
  };
  signature: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  price: string;
  amount: string;
  total: string;
};

export const placeOrder = async (orderData: PlaceOrderPayload) => {
  checkApiConfig();
  try {
    return await apiRequest('POST', `${API_BASE_URL}/api/orders`, orderData);
  } catch (error) {
    console.error("Network or API Error: Could not place order. Please ensure the API services are running and accessible.", error);
    throw error;
  }
};
