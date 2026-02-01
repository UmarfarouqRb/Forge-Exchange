import { Market, Order } from "@/types";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }
  return response.json() as Promise<T>;
}

export async function getAllTradingPairs(): Promise<string[]> {
  const response = await fetch(`${API_URL}/trading-pairs`);
  return handleResponse<string[]>(response);
}

export async function getMarketBySymbol(symbol: string): Promise<Market> {
  const response = await fetch(`${API_URL}/market/${symbol}`);
  return handleResponse<Market>(response);
}

export async function getAllMarkets(): Promise<Market[]> {
  const response = await fetch(`${API_URL}/market`);
  return handleResponse<Market[]>(response);
}

export async function getOrders(walletAddress: string): Promise<Order[]> {
  const response = await fetch(`${API_URL}/orders/${walletAddress}`);
  return handleResponse<Order[]>(response);
}

export async function submitIntent(intent: any) {
  const response = await fetch(`${API_URL}/intents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(intent),
  });
  return handleResponse(response);
}


export interface PlaceOrderPayload {
  intent: any; // Define a proper type for intent
  signature: `0x${string}`;
  orderType: 'limit' | 'market';
}

export async function placeOrder(payload: PlaceOrderPayload) {
  const response = await fetch(`${API_URL}/spot/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}


export async function getTokens(chainId: string): Promise<{ [symbol: string]: { address: `0x${string}`; decimals: number } }> {
  const response = await fetch(`${API_URL}/tokens?chainId=${chainId}`);
  return handleResponse<{ [symbol: string]: { address: `0x${string}`; decimals: number } }>(response);
}
