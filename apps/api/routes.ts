import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { getMarketState } from "./src/market";
import { health } from "./src/health";
import { getAllPairs, getTokens } from "./src/pairs";
import { getTrendingPairs } from "./src/trending";
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

  // --- Health Check ---
  app.get("/health", health);

  // --- Order Routes ---
 

  // --- Market Routes ---
  app.get("/api/markets/:pair", async (req: Request, res: Response) => {
    const { pair } = req.params;
    if (typeof pair !== 'string') {
        return res.status(400).json({ error: 'Pair parameter is required' });
    }

    try {
      const marketState = await getMarketState(pair);
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
        const pairs = await getAllPairs();
        res.json(pairs);
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
        const { chainId } = req.query;
        if (!chainId || typeof chainId !== 'string') {
            return res.status(400).json({ error: 'chainId query parameter is required' });
        }

        const numericChainId = parseInt(chainId);
        if (isNaN(numericChainId)) {
            return res.status(400).json({ error: `Invalid chainId: ${chainId}` });
        }

        try {
            const tokens = await getTokens(numericChainId);
            res.json(tokens);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

  const httpServer = createServer(app);
  return httpServer;
}
