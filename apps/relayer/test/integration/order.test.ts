import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Order, openDb, saveOrder } from '@forge/database';

describe('Relayer Integration Tests: Order Submission', () => {
  it('should successfully save a limit order to the database', async () => {
    const order: Order = {
      id: '0x1234567890abcdef',
      user: '0x1234567890abcdef',
      tokenIn: '0x1234567890abcdef',
      tokenOut: '0x1234567890abcdef',
      amountIn: '1000000000000000000',
      minAmountOut: '950000000000000000',
      nonce: 1,
      status: 'PENDING',
      symbol: 'WETH/USDC',
      side: 'buy',
      price: '0.95',
      amount: '1',
      total: '0.95',
      createdAt: Math.floor(Date.now() / 1000),
    };

    await saveOrder(order);

    const db = await openDb();
    const savedOrder = await db.get('SELECT * FROM orders WHERE id = ?', order.id);
    expect(savedOrder).toBeDefined();
    expect(savedOrder.id).toBe(order.id);
    expect(savedOrder.user).toBe(order.user);
  });
});
