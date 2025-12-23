import { ethers } from 'ethers';

export const getSigner = (signature: string, data: any) => {
  const message = JSON.stringify(data);
  const messageHash = ethers.utils.id(message);
  const signer = ethers.utils.recoverAddress(messageHash, signature);
  return signer;
};
