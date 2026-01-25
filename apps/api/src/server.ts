import express, { Request, Response } from "express";
import cors from "cors";
import { getMarketState } from "./market";
import { addOrder, getOrders } from "./orders";
import { health } from "./health";
import { getTrendingPairs } from "./trending";

const app = express();
app.use(express.json());
app.use(cors());

app.get("/health", health);

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

app.get("/api/trading-pairs/trending", async (req: Request, res: Response) => {
    try {
        const trendingPairs = await getTrendingPairs();
        res.json(trendingPairs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/order-book/:pair", async (req: Request, res: Response) => {
    const { pair } = req.params;
    if (typeof pair !== 'string') {
        return res.status(400).json({ error: 'Pair parameter is required' });
    }

    try {
      const marketState = await getMarketState(pair);
      if (!marketState) {
          return res.status(404).json({ error: "Market not found" });
      }
      res.json({ bids: marketState.bids, asks: marketState.asks });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
});

app.get("/api/orders/:address", getOrders);
app.post("/api/orders", addOrder);

const port = 3001;
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
