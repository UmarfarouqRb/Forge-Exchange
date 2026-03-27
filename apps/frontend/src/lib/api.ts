
import { Market, Order, TradingPair, Token, VaultAsset } from "@/types/market-data";
import { serialize } from './serializers';

const API_URL = 'https://forge-exchange-api.onrender.com';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    // Improved error logging
    console.error('API Error Response:', { 
      status: response.status, 
      statusText: response.statusText, 
      url: response.url, 
      errorBody: errorText 
    });
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  return response.json() as Promise<T>;
}

export interface IntentPayload {
    user: string;
    tokenIn: `0x${string}`;
    tokenOut: `0x${string}`;
    amountIn: string;
    minAmountOut: string;
    deadline: number;
    nonce: string;
    adapter: `0x${string}`;
    relayerFee: string;
}

// --- Aligned with apps/api/routes.ts ---

export async function getAllPairs(): Promise<TradingPair[]> {
  const response = await fetch(`${API_URL}/api/trading-pairs`);
  return handleResponse<TradingPair[]>(response);
}

export async function getTrendingPairs(): Promise<TradingPair[]> {
    const response = await fetch(`${API_URL}/api/trading-pairs/trending`);
    return handleResponse<TradingPair[]>(response);
}

export async function getMarketById(tradingPairId: string): Promise<Market> {
  const response = await fetch(`${API_URL}/api/markets/${tradingPairId}`);
  return handleResponse<Market>(response);
}

export async function getMarkets(): Promise<Market[]> {
    const response = await fetch(`${API_URL}/api/markets`);
    return handleResponse<Market[]>(response);
}

export async function getMarketBySymbol(symbol: string): Promise<Market> {
  const response = await fetch(`${API_URL}/api/markets/by-symbol/${symbol}`);
  return handleResponse<Market>(response);
}

export async function getOrders(walletAddress: string, accessToken: string): Promise<Order[]> {
  const response = await fetch(`${API_URL}/api/orders/${walletAddress}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });
  return handleResponse<Order[]>(response);
}

// This type represents the data sent to the backend to create an order.
export type CreateOrderRequest = {
    userAddress: string;
    tradingPairId: string;
    side: 'buy' | 'sell';
    price?: string | undefined;
    quantity: string;
    orderType: 'market' | 'limit';
    signature: `0x${string}`;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minAmountOut: string;
    deadline: string;
    nonce: string;
    adapter: string;
    relayerFee: string;
};


export async function createOrder(order: CreateOrderRequest, accessToken: string): Promise<Order> {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(order), // Caller is responsible for serialization
  });
  return handleResponse<Order>(response);
}

export async function getTokens(chainId: string): Promise<{ [symbol: string]: { address: `0x${string}`; decimals: number } }> {
    const response = await fetch(`${API_URL}/api/tokens?chainId=${chainId}`);
    return handleResponse<{ [symbol: string]: { address: `0x${string}`; decimals: number } }>(response);
}

export async function getVaultTokens(): Promise<VaultAsset[]> {
    const response = await fetch(`${API_URL}/api/vault/tokens`);
    return handleResponse<VaultAsset[]>(response);
}

// --- Relayer Proxied Routes ---

export interface PlaceOrderPayload {
  intent: IntentPayload;
  signature: `0x${string}`;
  orderType: 'limit' | 'market';
}

export async function placeOrder(payload: PlaceOrderPayload, accessToken: string): Promise<Order> {
  const response = await fetch(`${API_URL}/api/spot/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload), // Caller is responsible for serialization
  });
  return handleResponse<Order>(response);
}
