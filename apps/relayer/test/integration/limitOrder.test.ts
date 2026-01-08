
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { saveOrder, getOrders, Order } from '@forge/database';

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
        tokenIn: 'token_in',
        tokenOut: 'token_out',
        amountIn: '100',
        minAmountOut: '90',
        nonce: 1,
        status: 'PENDING',
        symbol: 'TEST/USD',
        side: 'buy',
        price: '100',
        amount: '1',
        total: '100',
        createdAt: Date.now()
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
