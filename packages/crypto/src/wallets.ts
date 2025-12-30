import { ethers } from 'ethers';

// This is a placeholder, in a real application you would use a more secure way to store and manage wallets
export const wallets = [
  new ethers.Wallet(process.env.PRIVATE_KEY_1 || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'),
];
