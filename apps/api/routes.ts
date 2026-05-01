import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { 
    getMarket, 
    getMarketBySymbol,
    getMarkets,
    getTokens,
    getVaultTokens,
    getTradingPairs,
    getTradingPairBySymbol,
    getLiquidityPools,
    getLiquidityPositions,
    deposit,
    withdraw
} from "@forge/markets";
import { health } from "./src/health";
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createOrder, getOrdersByAccount } from "./src/orders";
import { broadcastToTopic } from "./websocket";
import pointsRouter from "./src/routes/v1/points";

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
  app.use('/api/metrics', relayerProxy); // <-- ADD THIS LINE

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

  // --- Order Routesconst relayerProxy = createProxyMiddleware({
  
  app.post("/api/orders", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await createOrder(req.body);
      res.status(201).json(order);
    } catch (error) { 
      next(error);
    }
  });

  app.get("/api/orders/:account", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { account } = req.params;
      const orders = await getOrdersByAccount(account);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  });

  // --- Market Routes ---
  app.get("/api/markets", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const markets = await getMarkets();
        res.json(markets);
    } catch (error) {
        next(error);
    }
  });

  app.get("/api/markets/:id", async (req: Request, res: Response, next: NextFunction) => {
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
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/markets/by-symbol/:symbol", async (req: Request, res: Response, next: NextFunction) => {
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
    } catch (error) {
      next(error);
    }
  });

  // --- Trading Pairs Routes ---
  app.get("/api/trading-pairs", async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.json(getTradingPairs());
    } catch (error) {
        next(error);
    }
  });

  app.get("/api/trading-pairs/by-symbol/:symbol", async (req: Request, res: Response, next: NextFunction) => {
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
    } catch (error) {
      next(error);
    }
  });

  // --- Liquidity Routes ---
    app.get("/api/liquidity/pools", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pools = await getLiquidityPools();
            res.json(pools);
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/liquidity/positions", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const positions = await getLiquidityPositions();
            res.json(positions);
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/liquidity/deposit", async (req: Request, res: Response, next: NextFunction) => {
        try {
            await deposit(req.body);
            res.status(200).json({ message: "Deposit successful" });
        } catch (error) {
            next(error);
        }
    });

    app.post("/api/liquidity/withdraw", async (req: Request, res: Response, next: NextFunction) => {
        try {
            await withdraw(req.body);
            res.status(200).json({ message: "Withdrawal successful" });
        } catch (error) {
            next(error);
        }
    });

  // --- Token Route ---
    app.get("/api/tokens", async (req: Request, res: Response, next: NextFunction) => {
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
        } catch (error) {
            next(error);
        }
    });

    app.get("/api/vault/tokens", async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tokens = await getVaultTokens();
            res.json(tokens);
        } catch (error) {
            next(error);
        }
    });
    
    // --- Points Route ---
    app.use("/api/v1/points", pointsRouter);

  const httpServer = createServer(app);
  return httpServer;
}
