import { ethers } from 'ethers';
import { config } from './config';

export const provider = new ethers.providers.JsonRpcProvider(config.provider);
