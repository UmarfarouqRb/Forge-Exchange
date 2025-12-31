
import { apiRequest } from './queryClient';
import { ethers } from 'ethers';
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

// New getAssets function
export const getAssets = async (address: string | null) => {
    if (!address) return [];
    // For now, we'll return a mock list of assets.
    // In a real application, you would fetch this from your backend.
    return [
      { symbol: 'BTC', name: 'Bitcoin', balance: 0.5, value: 32500 },
      { symbol: 'ETH', name: 'Ethereum', balance: 10, value: 20000 },
      { symbol: 'USDT', name: 'Tether', balance: 5000, value: 5000 },
    ];
  };


  export const authorizeSession = async (sessionKey: ethers.Wallet, signer: ethers.Signer) => {
    if (!signer.provider) throw new Error("Signer does not have a provider");

    const expiration = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    const { chainId } = await signer.provider.getNetwork();

    const typedData = {
        domain: {
            name: 'SessionKeyManager',
            version: '1',
            chainId: chainId,
            verifyingContract: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        },
        types: {
            Authorization: [
                { name: 'sessionKey', type: 'address' },
                { name: 'expiration', type: 'uint256' },
            ],
        },
        primaryType: 'Authorization',
        message: {
            sessionKey: sessionKey.address,
            expiration: expiration,
        },
    };

    const signature = await signer.signTypedData(
        typedData.domain,
        typedData.types,
        typedData.message
    );

    await apiRequest('POST', '/api/session/authorize', {
        sessionKey: sessionKey.address,
        expiration,
        signature,
    });
};
