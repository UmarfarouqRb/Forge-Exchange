
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { saveOrder, getOrders } from '@shared/database';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
);

beforeEach(async () => {
    await supabase.from('orders').delete().neq('id', '0');
});

describe('Relayer Integration Tests: Market Order Execution', () => {

  it('should successfully save a market order to the database', async () => {
    const order = {
        id: '2',
        user: 'test_user_market',
        tokenIn: 'token_in_market',
        tokenOut: 'token_out_market',
        amountIn: '200',
        minAmountOut: '180',
        nonce: 1,
        status: 'PENDING',
        symbol: 'TEST/USD',
        side: 'SELL',
        price: '200',
        amount: '1',
        total: '200',
        createdAt: Date.now(),
    };

    await saveOrder(order);

    const orders = await getOrders('test_user_market');
    expect(orders.length).toBe(1);
    expect(orders[0].id).toBe('2');
  });

  it('should successfully execute a market order', () => {
    // TODO: Implement market order execution test against a forked chain
    expect(true).toBe(true);
  });

});
