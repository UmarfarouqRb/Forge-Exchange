export interface Order {
  id: string;
  user: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  nonce: number;
  status: string;
  symbol: string;
  side: string;
  price: string;
  amount: string;
  total: string;
  createdAt: number;
}
