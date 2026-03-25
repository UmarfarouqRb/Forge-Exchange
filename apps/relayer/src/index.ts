
import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import { MatchingEngine } from './matching/engine';
import { LiquidityEngine } from './liquidity/engine';

const app: express.Express = express();
app.use(express.json());

const API_URL = process.env.API_URL || 'https://forge-exchange-api.onrender.com';

async function broadcastToApi(topic: string, data: any) {
  try {
    await fetch(`${API_URL}/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, data }),
    });
  } catch (error) {
    console.error('Error broadcasting to API:', error);
  }
}

const liquidityEngine = new LiquidityEngine();
const matchingEngine = new MatchingEngine(liquidityEngine);

app.post('/api/orders', async (req: Request, res: Response) => {
    const order = req.body;
    try {
        const result = matchingEngine.processOrder(order);
        // Broadcast the successful order status
        broadcastToApi(`orders:${order.userAddress}`, { type: 'orderStatus', data: result });
        res.json(result);
    } catch (error: any) {
        // Broadcast the error
        broadcastToApi(`orders:${order.userAddress}`, { type: 'orderError', data: { message: error.message } });
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (_: Request, res: Response) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Relayer listening on port ${PORT}`);
});

// Initialize and start the matching engine
matchingEngine.start();

export default app;
