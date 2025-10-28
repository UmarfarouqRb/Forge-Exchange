import {
  type TradingPair,
  type InsertTradingPair,
  type MarketData,
  type InsertMarketData,
  type Order,
  type InsertOrder,
  type Asset,
  type InsertAsset,
  type Transaction,
  type InsertTransaction,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Trading Pairs
  getAllTradingPairs(category?: string): Promise<TradingPair[]>;
  getTradingPairBySymbol(symbol: string): Promise<TradingPair | undefined>;
  getTrendingPairs(limit?: number): Promise<TradingPair[]>;
  getTopGainers(limit?: number): Promise<TradingPair[]>;
  getTopLosers(limit?: number): Promise<TradingPair[]>;
  createTradingPair(pair: InsertTradingPair): Promise<TradingPair>;

  // Market Data
  getMarketData(symbol: string, limit?: number): Promise<MarketData[]>;
  createMarketData(data: InsertMarketData): Promise<MarketData>;

  // Orders
  getOrdersByWallet(walletAddress: string, category?: string): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;

  // Assets
  getAssetsByWallet(walletAddress: string): Promise<Asset[]>;
  getAssetByWalletAndSymbol(walletAddress: string, asset: string): Promise<Asset | undefined>;
  createOrUpdateAsset(asset: InsertAsset): Promise<Asset>;

  // Transactions
  getTransactionsByWallet(walletAddress: string, limit?: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
}

export class MemStorage implements IStorage {
  private tradingPairs: Map<string, TradingPair>;
  private marketData: Map<string, MarketData[]>;
  private orders: Map<string, Order>;
  private assets: Map<string, Asset>;
  private transactions: Map<string, Transaction>;

  constructor() {
    this.tradingPairs = new Map();
    this.marketData = new Map();
    this.orders = new Map();
    this.assets = new Map();
    this.transactions = new Map();
    this.initializeMockData();
  }

  private initializeMockData() {
    // Create mock trading pairs
    const mockPairs: InsertTradingPair[] = [
      {
        symbol: "BTCUSDT",
        baseAsset: "BTC",
        quoteAsset: "USDT",
        currentPrice: "45234.56",
        priceChange24h: "2.34",
        volume24h: "2400000000",
        high24h: "46500.00",
        low24h: "44100.00",
        isFavorite: false,
        category: "spot",
      },
      {
        symbol: "ETHUSDT",
        baseAsset: "ETH",
        quoteAsset: "USDT",
        currentPrice: "2345.67",
        priceChange24h: "3.45",
        volume24h: "1200000000",
        high24h: "2400.00",
        low24h: "2280.00",
        isFavorite: false,
        category: "spot",
      },
      {
        symbol: "BNBUSDT",
        baseAsset: "BNB",
        quoteAsset: "USDT",
        currentPrice: "312.45",
        priceChange24h: "-1.23",
        volume24h: "450000000",
        high24h: "325.00",
        low24h: "308.00",
        isFavorite: false,
        category: "spot",
      },
      {
        symbol: "SOLUSDT",
        baseAsset: "SOL",
        quoteAsset: "USDT",
        currentPrice: "98.76",
        priceChange24h: "5.67",
        volume24h: "350000000",
        high24h: "102.00",
        low24h: "92.00",
        isFavorite: false,
        category: "spot",
      },
      {
        symbol: "ADAUSDT",
        baseAsset: "ADA",
        quoteAsset: "USDT",
        currentPrice: "0.5234",
        priceChange24h: "-2.45",
        volume24h: "180000000",
        high24h: "0.5500",
        low24h: "0.5100",
        isFavorite: false,
        category: "spot",
      },
      {
        symbol: "XRPUSDT",
        baseAsset: "XRP",
        quoteAsset: "USDT",
        currentPrice: "0.6123",
        priceChange24h: "4.12",
        volume24h: "220000000",
        high24h: "0.6300",
        low24h: "0.5850",
        isFavorite: false,
        category: "spot",
      },
      // Futures pairs
      {
        symbol: "BTCUSDT",
        baseAsset: "BTC",
        quoteAsset: "USDT",
        currentPrice: "45240.00",
        priceChange24h: "2.38",
        volume24h: "3200000000",
        high24h: "46520.00",
        low24h: "44090.00",
        isFavorite: false,
        category: "futures",
      },
      {
        symbol: "ETHUSDT",
        baseAsset: "ETH",
        quoteAsset: "USDT",
        currentPrice: "2347.00",
        priceChange24h: "3.50",
        volume24h: "1800000000",
        high24h: "2405.00",
        low24h: "2275.00",
        isFavorite: false,
        category: "futures",
      },
    ];

    mockPairs.forEach((pair) => {
      const id = randomUUID();
      const tradingPair: TradingPair = { 
        ...pair, 
        id,
        category: pair.category || "spot",
        isFavorite: pair.isFavorite ?? false,
      };
      this.tradingPairs.set(id, tradingPair);
    });

    // Create mock assets for a sample wallet
    const sampleWallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
    const mockAssets: InsertAsset[] = [
      {
        walletAddress: sampleWallet,
        asset: "BTC",
        total: "2.50000000",
        available: "1.80000000",
        inOrder: "0.70000000",
        usdValue: "113086.40",
      },
      {
        walletAddress: sampleWallet,
        asset: "ETH",
        total: "15.00000000",
        available: "12.50000000",
        inOrder: "2.50000000",
        usdValue: "35185.05",
      },
      {
        walletAddress: sampleWallet,
        asset: "USDT",
        total: "50000.00000000",
        available: "45000.00000000",
        inOrder: "5000.00000000",
        usdValue: "50000.00",
      },
      {
        walletAddress: sampleWallet,
        asset: "BNB",
        total: "100.00000000",
        available: "85.00000000",
        inOrder: "15.00000000",
        usdValue: "31245.00",
      },
    ];

    mockAssets.forEach((asset) => {
      const id = randomUUID();
      const assetData: Asset = { 
        ...asset, 
        id,
        inOrder: asset.inOrder || "0",
      };
      this.assets.set(id, assetData);
    });

    // Create mock transactions
    const mockTransactions: InsertTransaction[] = [
      {
        walletAddress: sampleWallet,
        type: "deposit",
        asset: "BTC",
        amount: "1.00000000",
        status: "completed",
        txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      },
      {
        walletAddress: sampleWallet,
        type: "trade",
        asset: "ETH",
        amount: "5.00000000",
        status: "completed",
        txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      },
      {
        walletAddress: sampleWallet,
        type: "withdrawal",
        asset: "USDT",
        amount: "10000.00000000",
        status: "completed",
        txHash: "0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234",
      },
    ];

    mockTransactions.forEach((tx) => {
      const id = randomUUID();
      const transaction: Transaction = {
        ...tx,
        id,
        status: tx.status || "completed",
        txHash: tx.txHash || null,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      };
      this.transactions.set(id, transaction);
    });
  }

  // Trading Pairs
  async getAllTradingPairs(category?: string): Promise<TradingPair[]> {
    const pairs = Array.from(this.tradingPairs.values());
    if (category && category !== "all") {
      return pairs.filter((pair) => pair.category === category);
    }
    return pairs;
  }

  async getTradingPairBySymbol(symbol: string): Promise<TradingPair | undefined> {
    return Array.from(this.tradingPairs.values()).find((pair) => pair.symbol === symbol);
  }

  async getTrendingPairs(limit: number = 6): Promise<TradingPair[]> {
    const pairs = Array.from(this.tradingPairs.values())
      .filter((pair) => pair.category === "spot")
      .sort((a, b) => parseFloat(b.volume24h) - parseFloat(a.volume24h))
      .slice(0, limit);
    return pairs;
  }

  async getTopGainers(limit: number = 10): Promise<TradingPair[]> {
    const pairs = Array.from(this.tradingPairs.values())
      .filter((pair) => pair.category === "spot")
      .sort((a, b) => parseFloat(b.priceChange24h) - parseFloat(a.priceChange24h))
      .slice(0, limit);
    return pairs;
  }

  async getTopLosers(limit: number = 10): Promise<TradingPair[]> {
    const pairs = Array.from(this.tradingPairs.values())
      .filter((pair) => pair.category === "spot")
      .sort((a, b) => parseFloat(a.priceChange24h) - parseFloat(b.priceChange24h))
      .slice(0, limit);
    return pairs;
  }

  async createTradingPair(insertPair: InsertTradingPair): Promise<TradingPair> {
    const id = randomUUID();
    const pair: TradingPair = { 
      ...insertPair, 
      id,
      category: insertPair.category || "spot",
      isFavorite: insertPair.isFavorite ?? false,
    };
    this.tradingPairs.set(id, pair);
    return pair;
  }

  // Market Data
  async getMarketData(symbol: string, limit: number = 100): Promise<MarketData[]> {
    const data = this.marketData.get(symbol) || [];
    return data.slice(-limit);
  }

  async createMarketData(insertData: InsertMarketData): Promise<MarketData> {
    const id = randomUUID();
    const data: MarketData = { ...insertData, id };
    const existing = this.marketData.get(insertData.symbol) || [];
    existing.push(data);
    this.marketData.set(insertData.symbol, existing);
    return data;
  }

  // Orders
  async getOrdersByWallet(walletAddress: string, category?: string): Promise<Order[]> {
    const orders = Array.from(this.orders.values()).filter(
      (order) => order.walletAddress === walletAddress
    );
    if (category) {
      return orders.filter((order) => order.category === category);
    }
    return orders;
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      ...insertOrder,
      id,
      status: insertOrder.status || "pending",
      category: insertOrder.category || "spot",
      price: insertOrder.price || null,
      leverage: insertOrder.leverage || null,
      createdAt: new Date(),
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (order) {
      order.status = status;
      this.orders.set(id, order);
      return order;
    }
    return undefined;
  }

  // Assets
  async getAssetsByWallet(walletAddress: string): Promise<Asset[]> {
    return Array.from(this.assets.values()).filter(
      (asset) => asset.walletAddress === walletAddress
    );
  }

  async getAssetByWalletAndSymbol(
    walletAddress: string,
    asset: string
  ): Promise<Asset | undefined> {
    return Array.from(this.assets.values()).find(
      (a) => a.walletAddress === walletAddress && a.asset === asset
    );
  }

  async createOrUpdateAsset(insertAsset: InsertAsset): Promise<Asset> {
    const existing = await this.getAssetByWalletAndSymbol(
      insertAsset.walletAddress,
      insertAsset.asset
    );

    if (existing) {
      const updated: Asset = { 
        ...existing, 
        ...insertAsset,
        inOrder: insertAsset.inOrder || existing.inOrder || "0",
      };
      this.assets.set(existing.id, updated);
      return updated;
    }

    const id = randomUUID();
    const asset: Asset = { 
      ...insertAsset, 
      id,
      inOrder: insertAsset.inOrder || "0",
    };
    this.assets.set(id, asset);
    return asset;
  }

  // Transactions
  async getTransactionsByWallet(
    walletAddress: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((tx) => tx.walletAddress === walletAddress)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      status: insertTransaction.status || "completed",
      txHash: insertTransaction.txHash || null,
      timestamp: new Date(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }
}

export const storage = new MemStorage();
