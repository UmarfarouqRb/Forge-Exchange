import { Request, Response } from 'express';
import { MatchingEngine } from '../matching/engine';

// This is a simplified in-memory order book. In a real-world application, you would use a more robust solution like Redis.
export const orderBook: {bids: any[], asks: any[]} = {
    bids: [],
    asks: [],
};

export const getOrderBook = async (req: Request, res: Response) => {
    res.json(orderBook);
};

export const addOrder = async (req: Request, res: Response) => {
    const { order } = req.body;

    if (!order) {
        return res.status(400).json({ error: 'Order data is missing' });
    }

    if (order.side === 'buy') {
        orderBook.bids.push(order);
    } else {
        orderBook.asks.push(order);
    }

    res.status(201).json({ success: true });
};

// Start the matching engine
const matchingEngine = new MatchingEngine();
matchingEngine.start();
