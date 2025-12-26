import { Request, Response } from 'express';
import { getOrders as getOrdersFromDb } from '../db/db';

export async function getOrders(req: Request, res: Response) {
    const { address } = req.params;
    const orders = await getOrdersFromDb(address);
    res.json(orders);
}
