import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Trading Pairs Routes
  app.get("/api/trading-pairs", async (req, res) => {
    try {
      const { category } = req.query;
      const pairs = await storage.getAllTradingPairs(category as string);
      res.json(pairs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trading-pairs/trending", async (req, res) => {
    try {
      const pairs = await storage.getTrendingPairs(6);
      res.json(pairs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trading-pairs/top-gainers", async (req, res) => {
    try {
      const pairs = await storage.getTopGainers(10);
      res.json(pairs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trading-pairs/top-losers", async (req, res) => {
    try {
      const pairs = await storage.getTopLosers(10);
      res.json(pairs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trading-pairs/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const pair = await storage.getTradingPairBySymbol(symbol);
      if (!pair) {
        return res.status(404).json({ error: "Trading pair not found" });
      }
      res.json(pair);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Market Data Routes
  app.get("/api/market-data/:symbol", async (req, res) => {
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

  // Order Book Route (simulated data)
  app.get("/api/order-book/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const pair = await storage.getTradingPairBySymbol(symbol);
      
      if (!pair) {
        return res.status(404).json({ error: "Trading pair not found" });
      }

      const basePrice = parseFloat(pair.currentPrice);
      
      // Generate simulated order book data
      const bids = Array.from({ length: 20 }, (_, i) => ({
        price: (basePrice - i * (basePrice * 0.0002)).toFixed(2),
        amount: (Math.random() * 2).toFixed(4),
        total: ((basePrice - i * (basePrice * 0.0002)) * Math.random() * 2).toFixed(2),
      }));
      
      const asks = Array.from({ length: 20 }, (_, i) => ({
        price: (basePrice + i * (basePrice * 0.0002)).toFixed(2),
        amount: (Math.random() * 2).toFixed(4),
        total: ((basePrice + i * (basePrice * 0.0002)) * Math.random() * 2).toFixed(2),
      }));

      res.json({ bids, asks, symbol, timestamp: new Date() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Orders Routes
  app.get("/api/orders/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const { category } = req.query;
      const orders = await storage.getOrdersByWallet(
        walletAddress,
        category as string
      );
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validatedData);
      res.status(201).json(order);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid order data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const order = await storage.updateOrderStatus(id, status);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Assets Routes
  app.get("/api/assets/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const assets = await storage.getAssetsByWallet(walletAddress);
      res.json(assets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Transactions Routes
  app.get("/api/transactions/:walletAddress", async (req, res) => {
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

  app.post("/api/transactions", async (req, res) => {
    try {
      const transaction = await storage.createTransaction(req.body);
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
