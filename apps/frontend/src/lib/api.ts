import { apiRequest } from './queryClient';
import type { Order, Transaction } from '../types';
import { OrderBookData } from '@/types/orderbook';

const API_BASE_URL = 'https://forge-exchange-api.onrender.com';

const checkApiConfig = () => {
  if (!API_BASE_URL) {
    const errorMessage = "API service URL is not configured. The application cannot function without this.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

export const getTrendingPairs = async (): Promise<any[]> => {
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

export const getOrderBook = async (pair: string): Promise<OrderBookData> => {
  checkApiConfig();
  try {
    const response = await fetch(`${API_BASE_URL}/api/order-book/${pair}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: Failed to fetch order book for pair ${pair}. Status: ${response.status}. Message: ${errorText}`);
      throw new Error('Failed to fetch order book');
    }
    return response.json();
  } catch (error) {
    console.error("Network or API Error: Could not fetch order book. Please ensure the API services are running and accessible.", error);
    throw error;
  }
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

export const getTokens = async (chainId: string) => {
  checkApiConfig();
  try {
    const response = await fetch(`${API_BASE_URL}/api/tokens/${chainId}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: Failed to fetch tokens for chain ${chainId}. Status: ${response.status}. Message: ${errorText}`);
      throw new Error('Failed to fetch token addresses');
    }
    return response.json();
  } catch (error) {
    console.error("Network or API Error: Could not fetch tokens. Please ensure the API services are running and accessible.", error);
    throw error;
  }
};

export const getAssets = async (address: string | null) => {
  if (!address) return [];
  checkApiConfig();
  try {
    const response = await fetch(`${API_BASE_URL}/api/assets/${address}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: Failed to fetch assets for address ${address}. Status: ${response.status}. Message: ${errorText}`);
      throw new Error('Failed to fetch assets');
    }
    return response.json();
  } catch (error) {
    console.error("Network or API Error: Could not fetch assets. Please ensure the API services are running and accessible.", error);
    throw error;
  }
};

export const getTradingPair = async (symbol: string) => {
  checkApiConfig();
  try {
    const response = await fetch(`${API_BASE_URL}/api/trading-pairs/${symbol}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: Failed to fetch trading pair ${symbol}. Status: ${response.status}. Message: ${errorText}`);
      throw new Error('Failed to fetch trading pair');
    }
    return response.json();
  } catch (error) {
    console.error("Network or API Error: Could not fetch trading pair. Please ensure the API services are running and accessible.", error);
    throw error;
  }
}

export const getTransactions = async (address: string | undefined): Promise<Transaction[]> => {
    if (!address) return [];
    checkApiConfig();
    try {
        const response = await fetch(`${API_BASE_URL}/api/transactions/${address}`);
        if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: Failed to fetch transactions for address ${address}. Status: ${response.status}. Message: ${errorText}`);
        throw new Error('Failed to fetch transactions');
        }
        return response.json();
    } catch (error) {
        console.error("Network or API Error: Could not fetch transactions. Please ensure the API services are running and accessible.", error);
        throw error;
    }
};
