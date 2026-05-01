
import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import { MatchingEngine } from './matching/engine';
import { LiquidityEngine } from './liquidity/engine';
import { RetryWorker } from './worker';
import { setBook } from '@forge/markets';
import { createClient } from '@supabase/supabase-js';

const app: express.Express = express();
app.use(express.json());

const API_URL = process.env.API_URL || 'http://localhost:3001';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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

matchingEngine.on('agent_status', (data) => {
    const { userAddress, orderId } = data;
    if (userAddress && orderId) {
        const topic = `orders:${userAddress}`;
        broadcastToApi(topic, data);
    }
});

matchingEngine.on('orderbook_update', ({ pairId, bids, asks }) => {
    setBook(pairId, { bids, asks });
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

    matchingEngine.processOrder(order);
    res.status(202).json({ message: 'Order received and is being processed.' });
});

app.get('/api/metrics', async (req: Request, res: Response) => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // 1. Get 24h Volume
        const { data: volumeData, error: volumeError } = await supabase
            .from('trade_executions')
            .select('amount_usd')
            .gte('created_at', twentyFourHoursAgo);

        if (volumeError) throw volumeError;
        const volume24h = volumeData.reduce((sum, row) => sum + row.amount_usd, 0);

        // 2. Get Total Trades
        const { count: totalTrades, error: tradesError } = await supabase
            .from('trade_executions')
            .select('id', { count: 'exact', head: true });

        if (tradesError) throw tradesError;

        // 3. Get Unique Users
        // Note: This is not the most scalable approach for a large number of trades.
        // A dedicated database function (RPC) would be more performant.
        const { data: users, error: usersError } = await supabase
            .from('trade_executions')
            .select('user_address');

        if (usersError) throw usersError;
        const uniqueUsers = new Set(users.map(u => u.user_address)).size;

        res.json({
            volume_24h: volume24h,
            total_trades: totalTrades || 0,
            unique_users: uniqueUsers
        });

    } catch (error: any) {
        console.error('[Metrics] Error fetching trade metrics:', error);
        res.status(500).json({ error: 'Failed to fetch trade metrics', details: error.message });
    }
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
