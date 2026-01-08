
import { describe, it, expect } from 'vitest';
import { Order, getOrders, saveOrder } from '@forge/database';

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
      symbol: 'TEST/USD',
      side: 'buy',
      price: '100',
      amount: '1',
      total: '100',
      createdAt: Date.now(),
    };

    await saveOrder(order);

    const orders = await getOrders(order.user);
    const savedOrder = orders.find((o) => o.id === order.id);
    expect(savedOrder).toBeDefined();
    if (savedOrder) {
        expect(savedOrder.id).toBe(order.id);
        expect(savedOrder.user).toBe(order.user);
    }
  });
});
