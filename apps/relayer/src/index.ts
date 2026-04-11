
import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import { MatchingEngine } from './matching/engine';
import { LiquidityEngine } from './liquidity/engine';
import { RetryWorker } from './worker';

const app: express.Express = express();
app.use(express.json());

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function broadcastToApi(topic: string, data: any, orderId: string) {
  try {
    await fetch(`${API_URL}/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, data: { ...data, orderId } }),
    });
  } catch (error) {
    console.error('Error broadcasting to API:', error);
  }
}

const liquidityEngine = new LiquidityEngine();
const matchingEngine = new MatchingEngine(liquidityEngine);
const retryWorker = new RetryWorker(matchingEngine);

// The matching engine will emit status updates for the agent to consume
matchingEngine.on('agent_status', (data) => {
    const userAddress = data.userAddress;
    const orderId = data.orderId;
    if (userAddress && orderId) {
        // The topic is now orders specific to the user, not a generic agent topic
        const topic = `orders:${userAddress}`;
        broadcastToApi(topic, data, orderId);
    }
});

app.post('/api/orders', async (req: Request, res: Response) => {
    console.log('[Relayer] Received a new order payload:', JSON.stringify(req.body, null, 2));
    const order = req.body;

    if (!order.intent || !order.intent.user) {
        return res.status(400).json({ error: 'Invalid order payload: missing intent or user' });
    }

    // Acknowledge receipt and let the worker handle it.
    res.status(202).json({ message: 'Order received and will be processed.' });
});

app.get('/health', (_: Request, res: Response) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Relayer listening on port ${PORT}`);
});

// Start the matching engine and the retry worker
matchingEngine.start();
retryWorker.start();

export default app;
