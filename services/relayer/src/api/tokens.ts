import { Request, Response } from 'express';
import { chains } from '../config/chains';

export const getTokens = (req: Request, res: Response) => {
    const chainId = req.params.chainId;
    if (chains[chainId]) {
        res.json(chains[chainId]);
    } else {
        res.status(404).json({ error: 'Chain not found' });
    }
};