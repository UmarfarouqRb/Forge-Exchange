import { repository } from "../db";
import { Request, Response } from "express";

export async function getOrders(req: Request, res: Response) {
  const { market } = req.query;
  if (typeof market !== "string") {
    return res.status(400).json({ error: "Market query parameter is required" });
  }

  const orders = await repository.getOrdersByMarket(market);
  res.json(orders);
}
