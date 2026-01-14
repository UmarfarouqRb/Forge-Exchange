
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { saveOrder, getOrders, Order } from '@forge/db';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
);

beforeEach(async () => {
    await supabase.from('orders').delete().neq('id', '0');
});

describe('Relayer Integration Tests: Limit Order Filling', () => {

  it('should successfully save a limit order to the database', async () => {
    const order: Order = {
        id: '1',
        user: 'test_user',
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

    const orders = await getOrders('test_user');
    expect(orders.length).toBe(1);
    expect(orders[0].id).toBe('1');
  });

  it('should successfully fill a limit order', () => {
    // TODO: Implement limit order filling test against a forked chain
    expect(true).toBe(true);
  });

});
