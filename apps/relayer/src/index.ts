
// apps/relayer/src/index.ts
import express, { Request, Response } from 'express';
import { executeSpotTrade } from './spot';

const app: express.Express = express();
app.use(express.json());

app.post('/execute', async (req: Request, res: Response) => {
    const { intent, signature, orderType } = req.body;
    try {
        const result = await executeSpotTrade(intent, signature, orderType);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (_: Request, res: Response) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Relayer listening on port ${PORT}`);
});

export default app;
