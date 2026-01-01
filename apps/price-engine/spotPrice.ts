import { IStorage } from '../api/storage';
import { ethers } from 'ethers';

// --- Configuration ---
const ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL;
const QUICKNODE_RPC_URL = process.env.QUICKNODE_RPC_URL;

// TODO: Replace with your deployed SpotRouter contract address
const SPOT_ROUTER_ADDRESS = '0x0000000000000000000000000000000000000000';

// TODO: Replace with the on-chain addresses for the assets you want to price
const TOKEN_IN_ADDRESS = '0x4200000000000000000000000000000000000006'; // WETH on Base
const TOKEN_OUT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913'; // USDC on Base

// The ABI for the quote function from your SpotRouter
const SPOT_ROUTER_ABI = [
  'function quote(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut)'
];

const ONE_ETHER = ethers.parseEther("1");

export class SpotPriceService {
  private storage: IStorage;
  private intervalId: NodeJS.Timeout | null = null;
  private primaryProvider: ethers.JsonRpcProvider;
  private fallbackProvider: ethers.JsonRpcProvider;
  private spotRouter: ethers.Contract;
  private fallbackSpotRouter: ethers.Contract;

  constructor(storage: IStorage) {
    this.storage = storage;

    if (!ALCHEMY_RPC_URL || !QUICKNODE_RPC_URL) {
      throw new Error('Please set ALCHEMY_RPC_URL and QUICKNODE_RPC_URL environment variables');
    }

    // Setup primary and fallback providers for resilience
    this.primaryProvider = new ethers.JsonRpcProvider(ALCHEMY_RPC_URL);
    this.fallbackProvider = new ethers.JsonRpcProvider(QUICKNODE_RPC_URL);

    // Create contract instances for both providers
    this.spotRouter = new ethers.Contract(SPOT_ROUTER_ADDRESS, SPOT_ROUTER_ABI, this.primaryProvider);
    this.fallbackSpotRouter = new ethers.Contract(SPOT_ROUTER_ADDRESS, SPOT_ROUTER_ABI, this.fallbackProvider);
  }

  start() {
    // Poll at a safe interval to avoid RPC rate limits
    this.intervalId = setInterval(() => this.updatePrice(), 8000); 
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async updatePrice() {
    try {
      const price = await this.fetchPriceFromChain(this.spotRouter);
      this.updateStorage(price);
    } catch (primaryError) {
      console.error('Primary provider failed. Trying fallback...', primaryError);
      try {
        const price = await this.fetchPriceFromChain(this.fallbackSpotRouter);
        this.updateStorage(price);
      } catch (fallbackError) {
        console.error('Fallback provider also failed:', fallbackError);
      }
    }
  }

  private async fetchPriceFromChain(router: ethers.Contract): Promise<string> {
    // We query the price for 1 unit of the base token (e.g., 1 WETH)
    const amountOut = await router.quote(TOKEN_IN_ADDRESS, TOKEN_OUT_ADDRESS, ONE_ETHER);
    // The amountOut will be in terms of the quote asset's decimals. We format it to a readable string.
    // Assuming USDC has 6 decimals.
    return ethers.formatUnits(amountOut, 6); 
  }

  private async updateStorage(price: string) {
    // Symbol is based on the trading pair we are querying
    const symbol = 'ETHUSDC'; 
    const tradingPair = await this.storage.getTradingPairBySymbol(symbol, 'spot');

    if (tradingPair) {
      const updatedTradingPair = {
        ...tradingPair,
        currentPrice: price,
      };
      await this.storage.updateTradingPair(updatedTradingPair);
      console.log(`Updating spot price for ${symbol} to ${price}`);
    } else {
      console.warn(`Trading pair ${symbol} not found in storage.`);
    }
  }
}
