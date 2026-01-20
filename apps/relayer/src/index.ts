
// apps/relayer/src/index.ts
import express from 'express'
import { executeSpotTrade } from './spot';

const app = express()
app.use(express.json())

app.post('/execute', async (req, res) => {
    const { intent, signature, orderType } = req.body;
    try {
        const result = await executeSpotTrade(intent, signature, orderType);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (_, res) => res.json({ ok: true }))

export default app
