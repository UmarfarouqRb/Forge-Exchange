
import { Market, Order, TradingPair, InsertOrder } from "@/types/index";

const API_URL = 'https://forge-exchange-api.onrender.com';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', response.status, errorText);
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
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

export async function getMarketBySymbol(symbol: string): Promise<Market> {
  const response = await fetch(`${API_URL}/api/markets/by-symbol/${symbol}`);
  return handleResponse<Market>(response);
}

export async function getOrders(walletAddress: string): Promise<Order[]> {
  const response = await fetch(`${API_URL}/api/orders/${walletAddress}`);
  return handleResponse<Order[]>(response);
}

export async function createOrder(order: InsertOrder): Promise<Order> {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(order),
  });
  return handleResponse<Order>(response);
}

export async function getTokens(chainId: string): Promise<{ [symbol: string]: { address: `0x${string}`; decimals: number } }> {
    const response = await fetch(`${API_URL}/api/tokens?chainId=${chainId}`);
    return handleResponse<{ [symbol: string]: { address: `0x${string}`; decimals: number } }>(response);
}

export async function getVaultTokens(): Promise<any> {
    const response = await fetch(`${API_URL}/api/vault/tokens`);
    return handleResponse<any>(response);
}

// --- Relayer Proxied Routes ---

export interface PlaceOrderPayload {
  intent: IntentPayload;
  signature: `0x${string}`;
  orderType: 'limit' | 'market';
}

export async function placeOrder(payload: PlaceOrderPayload) {
  const response = await fetch(`${API_URL}/api/spot/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}
