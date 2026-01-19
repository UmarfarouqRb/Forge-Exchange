import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createProxyMiddleware } from 'http-proxy-middleware';

// Define the proxy middleware for the relayer service
const relayerProxy = createProxyMiddleware({
  target: process.env.RELAYER_URL,
  changeOrigin: true,
  ws: true,
});

export async function registerRoutes(app: Express): Promise<Server> {

  // --- Relayer Proxy Routes ---
  app.use('/api/spot', relayerProxy);
  app.use('/api/session/authorize', relayerProxy);
  app.use('/api/orders', relayerProxy);
  app.use('/api/tokens', relayerProxy);
  app.use('/api/order-book', relayerProxy);
  app.use('/api/markets', relayerProxy);
  app.use('/api/health', relayerProxy);


  // Trading Pairs Routes
  app.get("/api/trading-pairs", async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      const pairs = await storage.getAllTradingPairs(category as string);
      res.json(pairs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trading-pairs/trending", async (req: Request, res: Response) => {
    try {
      const pairs = await storage.getTrendingPairs(6);
      res.json(pairs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trading-pairs/top-gainers", async (req: Request, res: Response) => {
    try {
      const pairs = await storage.getTopGainers(10);
      res.json(pairs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trading-pairs/top-losers", async (req: Request, res: Response) => {
    try {
      const pairs = await storage.getTopLosers(10);
      res.json(pairs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trading-pairs/:symbol", async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const { category } = req.query;
      const pair = await storage.getTradingPairBySymbol(symbol, category as string);
      if (!pair) {
        return res.status(404).json({ error: "Trading pair not found" });
      }
      res.json(pair);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Market Data Routes
  app.get("/api/market-data/:symbol", async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const { limit } = req.query;
      const data = await storage.getMarketData(
        symbol,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Assets Routes
  app.get("/api/assets/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const assets = await storage.getAssetsByWallet(walletAddress);
      res.json(assets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Transactions Routes
  app.get("/api/transactions/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { limit } = req.query;
      const transactions = await storage.getTransactionsByWallet(
        walletAddress,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions", async (req: Request, res: Response) => {
    try {
      const transaction = await storage.createTransaction(req.body);
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Trades Route
  app.get("/api/trades/:walletAddress", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const trades = await storage.getTradesByWallet(walletAddress);
      res.json(trades);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // Deposit Route
  app.post("/api/transactions/deposit", async (req: Request, res: Response) => {
    try {
      const { walletAddress, asset, amount } = req.body;
      const MINIMUM_DEPOSIT = 10;

      if (!walletAddress || !asset || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const depositAmount = parseFloat(amount);
      if (isNaN(depositAmount) || depositAmount <= 0) {
        return res.status(400).json({ error: "Invalid deposit amount" });
      }

      if (depositAmount < MINIMUM_DEPOSIT) {
        return res.status(400).json({ 
          error: `Minimum deposit is $${MINIMUM_DEPOSIT}` 
        });
      }

      const transaction = await storage.createTransaction({
        walletAddress,
        type: "deposit",
        asset,
        amount: depositAmount.toString(),
        status: "completed",
        txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
        timestamp: new Date().toISOString(),
      });

      const existingAsset = await storage.getAssetByWalletAndSymbol(walletAddress, asset);
      if (existingAsset) {
        const newTotal = parseFloat(existingAsset.total) + depositAmount;
        const newAvailable = parseFloat(existingAsset.available) + depositAmount;
        await storage.createOrUpdateAsset({
          walletAddress,
          asset,
          total: newTotal.toString(),
          available: newAvailable.toString(),
          inOrder: existingAsset.inOrder,
          usdValue: newTotal.toString(),
        });
      } else {
        await storage.createOrUpdateAsset({
          walletAddress,
          asset,
          total: depositAmount.toString(),
          available: depositAmount.toString(),
          inOrder: "0",
          usdValue: depositAmount.toString(),
        });
      }

      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions/withdraw", async (req: Request, res: Response) => {
    try {
      const { walletAddress, asset, amount } = req.body;
      const MINIMUM_WITHDRAWAL = 10;
      const WITHDRAWAL_FEE = 0.1;

      if (!walletAddress || !asset || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const withdrawAmount = parseFloat(amount);
      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        return res.status(400).json({ error: "Invalid withdrawal amount" });
      }

      if (withdrawAmount < MINIMUM_WITHDRAWAL) {
        return res.status(400).json({ 
          error: `Minimum withdrawal is $${MINIMUM_WITHDRAWAL}` 
        });
      }

      const existingAsset = await storage.getAssetByWalletAndSymbol(walletAddress, asset);
      if (!existingAsset) {
        return res.status(400).json({ error: "Asset not found" });
      }

      const totalCost = withdrawAmount + WITHDRAWAL_FEE;
      const available = parseFloat(existingAsset.available);
      
      if (available < totalCost) {
        return res.status(400).json({ 
          error: `Insufficient balance. Need $${totalCost.toFixed(2)} (including $${WITHDRAWAL_FEE} fee)` 
        });
      }

      const transaction = await storage.createTransaction({
        walletAddress,
        type: "withdrawal",
        asset,
        amount: withdrawAmount.toString(),
        status: "completed",
        txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
        timestamp: new Date().toISOString(),
      });

      const newTotal = parseFloat(existingAsset.total) - totalCost;
      const newAvailable = parseFloat(existingAsset.available) - totalCost;
      
      await storage.createOrUpdateAsset({
        walletAddress,
        asset,
        total: Math.max(0, newTotal).toString(),
        available: Math.max(0, newAvailable).toString(),
        inOrder: existingAsset.inOrder,
        usdValue: Math.max(0, newTotal).toString(),
      });

      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
