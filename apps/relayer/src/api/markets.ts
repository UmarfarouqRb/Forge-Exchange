import { Request, Response } from "express";
import { TOKENS } from "../config/contracts";

const markets = [
  {
    id: "WETH-USDC",
    base: TOKENS.WETH,
    quote: TOKENS.USDC,
  },
];

export async function getMarkets(req: Request, res: Response) {
  res.json(markets);
}
