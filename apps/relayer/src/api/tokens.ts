import { Request, Response } from 'express';
import { chains } from '../config/chains';

export const getTokens = (req: Request, res: Response) => {
    const chainId = req.params.chainId;
    const chain = chains[chainId as keyof typeof chains];
    if (chain) {
        res.json(chain);
    } else {
        res.status(404).json({ error: 'Chain not found' });
    }
};