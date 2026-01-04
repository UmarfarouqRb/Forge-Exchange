
import { Request, Response } from 'express';
import { getOrders as getOrdersFromDb, saveOrder } from '@forge/database';

export async function getOrders(req: Request, res: Response) {
    const { address } = req.params;
    const orders = await getOrdersFromDb(address);
    res.json(orders);
}

export async function addOrder(req: Request, res: Response) {
    const { order } = req.body;

    if (!order) {
        return res.status(400).json({ error: 'Order data is missing' });
    }

    await saveOrder(order);

    res.status(201).json({ success: true });
}
