import { IStorage } from '../api/storage';
import { ethers } from 'ethers';

// --- Configuration ---
const ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL;
const QUICKNODE_RPC_URL = process.env.QUICKNODE_RPC_URL;

// TODO: Replace with your deployed PerpetualLp contract address
const PERPETUAL_LP_ADDRESS = '0x0000000000000000000000000000000000000000';

// TODO: Replace with the on-chain address for the asset you want to price (e.g., WBTC)
const INDEX_TOKEN_ADDRESS = '0x1ceA84203673764244E45670769B559263136a82'; // WBTC on Base

// The ABI for the getIndexPrice function from your PerpetualLp contract
// This assumes the price is returned as a uint256 with 18 decimals.
const PERPETUAL_LP_ABI = [
  'function getIndexPrice(address asset) external view returns (uint256 price)'
];

export class PerpPriceService {
  private storage: IStorage;
  private intervalId: NodeJS.Timeout | null = null;
  private primaryProvider: ethers.JsonRpcProvider;
  private fallbackProvider: ethers.JsonRpcProvider;
  private perpLp: ethers.Contract;
  private fallbackPerpLp: ethers.Contract;

  constructor(storage: IStorage) {
    this.storage = storage;

    if (!ALCHEMY_RPC_URL || !QUICKNODE_RPC_URL) {
      throw new Error('Please set ALCHEMY_RPC_URL and QUICKNODE_RPC_URL environment variables');
    }

    // Setup primary and fallback providers for resilience
    this.primaryProvider = new ethers.JsonRpcProvider(ALCHEMY_RPC_URL);
    this.fallbackProvider = new ethers.JsonRpcProvider(QUICKNODE_RPC_URL);

    // Create contract instances for both providers
    this.perpLp = new ethers.Contract(PERPETUAL_LP_ADDRESS, PERPETUAL_LP_ABI, this.primaryProvider);
    this.fallbackPerpLp = new ethers.Contract(PERPETUAL_LP_ADDRESS, PERPETUAL_LP_ABI, this.fallbackProvider);
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
      const price = await this.fetchPriceFromChain(this.perpLp);
      this.updateStorage(price);
    } catch (primaryError) {
      console.error('Primary provider failed for perps. Trying fallback...', primaryError);
      try {
        const price = await this.fetchPriceFromChain(this.fallbackPerpLp);
        this.updateStorage(price);
      } catch (fallbackError) {
        console.error('Fallback provider for perps also failed:', fallbackError);
      }
    }
  }

  private async fetchPriceFromChain(contract: ethers.Contract): Promise<string> {
    const priceWei = await contract.getIndexPrice(INDEX_TOKEN_ADDRESS);
    // The price is returned from the contract with 18 decimals, format it to a human-readable string.
    return ethers.formatUnits(priceWei, 18);
  }

  private async updateStorage(price: string) {
    // Symbol is based on the trading pair we are querying
    const symbol = 'BTCUSDT'; 
    const tradingPair = await this.storage.getTradingPairBySymbol(symbol, 'futures');

    if (tradingPair) {
      const updatedTradingPair = {
        ...tradingPair,
        currentPrice: price,
      };
      await this.storage.updateTradingPair(updatedTradingPair);
      console.log(`Updating perp price for ${symbol} to ${price}`);
    } else {
      console.warn(`Trading pair ${symbol} not found in storage.`);
    }
  }
}
