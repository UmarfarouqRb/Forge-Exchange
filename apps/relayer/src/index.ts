
import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import { MatchingEngine } from './matching/engine';
import { LiquidityEngine } from './liquidity/engine';
import { RetryWorker } from './worker';
import { setBook } from '@forge/markets'; // Correctly import the store function

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
const retryWorker = new RetryWorker(matchingEngine);

// --- Event Listeners ---

// 1. Listen for agent status updates to broadcast to the user-specific channel
matchingEngine.on('agent_status', (data) => {
    const { userAddress, orderId } = data;
    if (userAddress && orderId) {
        const topic = `orders:${userAddress}`;
        broadcastToApi(topic, data);
    }
});

// 2. Listen for order book updates to sync with the @forge/markets store
matchingEngine.on('orderbook_update', ({ pairId, bids, asks }) => {
    // Update the shared in-memory store
    setBook(pairId, { bids, asks });

    // Broadcast the update to all clients subscribed to that market
    const topic = `market:${pairId}`;
    broadcastToApi(topic, { bids, asks });
});


// --- API Endpoints ---

app.post('/api/orders', async (req: Request, res: Response) => {
    console.log('[Relayer] Received a new order payload:', JSON.stringify(req.body, null, 2));
    const order = req.body;

    if (!order.intent || !order.intent.user) {
        return res.status(400).json({ error: 'Invalid order payload: missing intent or user' });
    }

    // Let the matching engine handle the order asynchronously
    matchingEngine.processOrder(order);

    // Acknowledge receipt immediately
    res.status(202).json({ message: 'Order received and is being processed.' });
});

app.get('/health', (_: Request, res: Response) => res.json({ ok: true }));


// --- Server Startup ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Relayer listening on port ${PORT}`);
});

// Start the core components
matchingEngine.start();
retryWorker.start();

export default app;
