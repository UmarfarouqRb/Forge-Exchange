import { queryClient, apiRequest } from './queryClient';
import { ethers } from 'ethers';
import { Order } from '@shared/schema';

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

export const placeOrder = async (orderData: any) => {
    return apiRequest('POST', '/api/spot', orderData);
};

export const getTokens = async (chainId: string) => {
    const response = await fetch(`/api/tokens/${chainId}`);
    if (!response.ok) throw new Error('Failed to fetch token addresses');
    return response.json();
}

export const authorizeSession = async (sessionKey: ethers.Wallet, signer: ethers.Signer) => {
    const expiration = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    const chainId = await signer.getChainId();

    const typedData = {
        domain: {
            name: 'SessionKeyManager',
            version: '1',
            chainId,
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

    const signature = await signer._signTypedData(typedData.domain, typedData.types, typedData.message);

    await apiRequest('POST', '/api/session/authorize', {
        sessionKey: sessionKey.address,
        expiration,
        signature,
    });
};
