
import express, { Request, Response } from 'express';
import { executeSpotTrade } from './spot';
import fetch from 'node-fetch';

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

app.post('/execute', async (req: Request, res: Response) => {
    const { intent, signature, orderType } = req.body;
    try {
        const result = await executeSpotTrade(intent, signature, orderType);
        // Broadcast the successful order status
        broadcastToApi(`orders:${intent.user}`, { type: 'orderStatus', data: result });
        res.json(result);
    } catch (error: any) {
        // Broadcast the error
        broadcastToApi(`orders:${intent.user}`, { type: 'orderError', data: { message: error.message } });
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (_: Request, res: Response) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Relayer listening on port ${PORT}`);
});

export default app;
