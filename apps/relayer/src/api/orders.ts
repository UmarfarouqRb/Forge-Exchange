
import { Request, Response } from "express";
import { verifyTypedData } from "viem";
import { anvil } from "viem/chains";
import { Order, saveOrder, getOrders } from "@forge/db";

export async function addOrder(req: Request, res: Response) {
  const { intent, signature, side, orderType, price, amount, total } = req.body;

  const domain = {
    name: "IntentSpotRouter",
    version: "1",
    chainId: anvil.id,
    verifyingContract: intent.verifyingContract,
  };

  const types = {
    SwapIntent: [
        { name: "user", type: "address" },
        { name: "tokenIn", type: "address" },
        { name: "tokenOut", type: "address" },
        { name: "amountIn", type: "uint256" },
        { name: "minAmountOut", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "adapter", type: "address" },
        { name: "relayerFee", type: "uint256" },
    ],
  };

  const valid = await verifyTypedData({
    address: intent.user,
    domain,
    types,
    primaryType: "SwapIntent",
    message: intent,
    signature,
  });

  if (!valid) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  const order: Order = {
    id: intent.nonce,
    user: intent.user,
    pair: `${intent.tokenIn}/${intent.tokenOut}`,
    side: side,
    type: orderType,
    price: price,
    amount: amount,
    filled: "0",
    status: "open",
    createdAt: new Date().toISOString(),
    symbol: `${intent.tokenIn}/${intent.tokenOut}`,
    total: total,
    leverage: "1",
  };

  await saveOrder(order);

  res.status(201).json(order);
}

export async function getOrdersByMarket(req: Request, res: Response) {
  const { market } = req.query;
  if (typeof market !== "string") {
    return res.status(400).json({ error: "Market query parameter is required" });
  }

  const orders = await getOrders(market);
  res.json(orders);
}
