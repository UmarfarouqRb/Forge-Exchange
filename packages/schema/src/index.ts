import { z } from 'zod';

export const Order = z.object({
  id: z.string(),
  user: z.string(),
  pair: z.string(),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['limit', 'market']),
  price: z.string(),
  amount: z.string(),
  filled: z.string(),
  status: z.enum(['open', 'filled', 'canceled']),
  createdAt: z.string(),
});

export type Order = z.infer<typeof Order>;