
import { describe, it, expect } from 'vitest';
import { Order, getOrders, saveOrder } from '@forge/db';

describe('Relayer Integration Tests: Order Submission', () => {
  it('should successfully save a limit order to the database', async () => {
    const order: Order = {
      id: '0x1234567890abcdef',
      user: '0x1234567890abcdef',
      pair: 'TEST/USD',
      side: 'buy',
      type: 'limit',
      price: '100',
      amount: '1',
      filled: '0',
      status: 'open',
      createdAt: new Date().toISOString(),
      symbol: 'TEST/USD',
      total: '100',
      leverage: '1',
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
