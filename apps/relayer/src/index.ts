
import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import { MatchingEngine } from './matching/engine';
import { LiquidityEngine } from './liquidity/engine';

const app: express.Express = express();
app.use(express.json());

const API_URL = process.env.API_URL || 'http://localhost:3001';

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

// The matching engine will emit status updates for the agent to consume
matchingEngine.on('agent_status', (data) => {
    const userAddress = data.userAddress;
    if (userAddress) {
        // The topic is now orders specific to the user, not a generic agent topic
        const topic = `orders:${userAddress}`;
        broadcastToApi(topic, data);
    }
});

app.post('/api/orders', async (req: Request, res: Response) => {
    const order = req.body;
    try {
        matchingEngine.processOrder(order);
        res.status(202).json({ message: 'Order received and is being processed.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (_: Request, res: Response) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Relayer listening on port ${PORT}`);
});

matchingEngine.start();

export default app;
