
import { apiRequest } from './queryClient';
import type { Order } from '../types';

export const getOrderBook = async (pair: string) => {
  const response = await fetch(`/api/order-book/${pair}`);
  if (!response.ok) throw new Error('Failed to fetch order book');
  return response.json();
};

export const getOrders = async (address: string | undefined): Promise<Order[]> => {
  if (!address) return [];
  const response = await fetch(`/api/orders/${address}?category=spot`);
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
};

export type PlaceOrderPayload = {
    intent: {
        user: string;
        tokenIn: string;
        tokenOut: string;
        amountIn: string;
        price: string;
        amountOutMin: string;
        nonce: string;
    };
    signature: string;
};

export const placeOrder = async (orderData: PlaceOrderPayload) => {
    return apiRequest('POST', '/api/spot', orderData);
};

export const getTokens = async (chainId: string) => {
    const response = await fetch(`/api/tokens/${chainId}`);
    if (!response.ok) throw new Error('Failed to fetch token addresses');
    return response.json();
}

export const getAssets = async (address: string | null) => {
    if (!address) return [];
    const response = await fetch(`/api/assets/${address}`);
    if (!response.ok) throw new Error('Failed to fetch assets');
    return response.json();
  };
