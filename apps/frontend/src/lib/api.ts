
const RELAYER_URL = import.meta.env.VITE_RELAYER_URL;

import { apiRequest } from './queryClient';
import type { Order } from '../types';

export const getOrderBook = async (pair: string) => {
  const response = await fetch(`${RELAYER_URL}/api/order-book/${pair}`);
  if (!response.ok) throw new Error('Failed to fetch order book');
  return response.json();
};

export const getOrders = async (address: string | undefined): Promise<Order[]> => {
  if (!address) return [];
  const response = await fetch(`${RELAYER_URL}/api/orders/${address}?category=spot`);
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
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
  return apiRequest('POST', `${RELAYER_URL}/api/orders`, orderData);
};

export const getTokens = async (chainId: string) => {
  const response = await fetch(`${RELAYER_URL}/api/tokens/${chainId}`);
  if (!response.ok) throw new Error('Failed to fetch token addresses');
  return response.json();
};

export const getAssets = async (address: string | null) => {
  if (!address) return [];
  const response = await fetch(`${RELAYER_URL}/api/assets/${address}`);
  if (!response.ok) throw new Error('Failed to fetch assets');
  return response.json();
};
