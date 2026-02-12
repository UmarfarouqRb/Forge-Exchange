
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { getMarket, getMarketBySymbol } from "./src/market";
import { health } from "./src/health";
import { getMarkets } from "./src/markets";
import { getTokens } from "./src/tokens";
import { getTrendingPairs } from "./src/trending";
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createOrder, getOrdersByAccount } from "./src/orders";
import { broadcastToTopic } from "./websocket";
import { getVaultTokens } from "./src/vault";
import { getTradingPairs, getTradingPairBySymbol } from "./src/trading-pairs";

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

  // --- Health Check ---
  app.get("/health", health);

  // Route for the relayer to post order status updates
  app.post("/api/broadcast", (req: Request, res: Response) => {
    const { topic, data } = req.body;
    if (!topic || !data) {
      return res.status(400).json({ error: "Topic and data are required" });
    }
    broadcastToTopic(topic, data);
    res.status(200).send({ message: "Broadcast successful" });
  });

  // --- Order Routes ---
  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      const order = await createOrder(req.body);
      res.status(201).json(order);
    } catch (error: any) { 
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/orders/:account", async (req: Request, res: Response) => {
    try {
      const { account } = req.params;
      const orders = await getOrdersByAccount(account);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Market Routes ---
  app.get("/api/markets/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        return res.status(400).json({ error: 'ID parameter is required' });
    }

    try {
      const marketState = await getMarket(id);
      if (!marketState) {
          return res.status(404).json({ error: "Market not found" });
      }
      res.json(marketState);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/markets/by-symbol/:symbol", async (req: Request, res: Response) => {
    const { symbol } = req.params;
    if (typeof symbol !== 'string') {
        return res.status(400).json({ error: 'Symbol parameter is required' });
    }

    try {
      const marketState = await getMarketBySymbol(symbol);
      if (!marketState) {
          return res.status(404).json({ error: "Market not found" });
      }
      res.json(marketState);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Trading Pairs Routes ---
  app.get("/api/trading-pairs", async (req: Request, res: Response) => {
    try {
        res.json(getTradingPairs());
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trading-pairs/by-symbol/:symbol", async (req: Request, res: Response) => {
    const { symbol } = req.params;
    if (typeof symbol !== 'string') {
        return res.status(400).json({ error: 'Symbol parameter is required' });
    }

    try {
      const pair = getTradingPairBySymbol(symbol);
      if (!pair) {
          return res.status(404).json({ error: "Trading pair not found" });
      }
      res.json(pair);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/trading-pairs/trending", async (req: Request, res: Response) => {
    try {
        const trendingPairs = await getTrendingPairs();
        res.json(trendingPairs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
  });

  // --- Token Route ---
    app.get("/api/tokens", async (req: Request, res: Response) => {
        try {
            const { chainId } = req.query;
            const tokens = getTokens();
            const tokenDict: { [symbol: string]: { address: `0x${string}`; decimals: number } } = {};
            for (const token of tokens) {
              tokenDict[token.symbol] = {
                address: token.address as `0x${string}`,
                decimals: token.decimals,
              };
            }
            res.json(tokenDict);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.get("/api/vault/tokens", async (req: Request, res: Response) => {
        try {
            const tokens = await getVaultTokens();
            res.json(tokens);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

  const httpServer = createServer(app);
  return httpServer;
}
