
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MatchingEngine } from './matching/engine';
import { getAddress } from 'viem';

export class RetryWorker {
    private supabase: SupabaseClient;
    private matchingEngine: MatchingEngine;
    private intervalId?: NodeJS.Timeout;

    constructor(matchingEngine: MatchingEngine) {
        this.matchingEngine = matchingEngine;
        this.supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }

    start() {
        console.log('Starting Retry Worker...');
        this.intervalId = setInterval(() => this.processRetries(), 5000); // Check every 5 seconds
    }

    stop() {
        console.log('Stopping Retry Worker...');
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    private async processRetries() {
        const { data: orders, error } = await this.supabase
            .from('orders')
            .select('*')
            .in('status', ['pending', 'processing'])
            .lt('retries', 3); // Limit retries to 3

        if (error) {
            console.error('[Worker] Error fetching retryable orders:', error);
            return;
        }

        if (orders && orders.length > 0) {
            console.log(`[Worker] Found ${orders.length} orders to process.`);
            for (const order of orders) {
                try {
                    // Increment retry count before processing
                    await this.supabase
                        .from('orders')
                        .update({ retries: (order.retries || 0) + 1, status: 'processing' })
                        .eq('id', order.id);

                    // Faithfully reconstruct and normalize the intent, just as the API does.
                    const normalizedIntent = {
                        user: getAddress(order.user_address),
                        tokenIn: getAddress(order.token_in),
                        tokenOut: getAddress(order.token_out),
                        amountIn: BigInt(order.amount_in),
                        minAmountOut: BigInt(order.min_amount_out),
                        deadline: BigInt(order.deadline),
                        nonce: BigInt(order.nonce),
                        adapter: getAddress(order.adapter),
                        relayerFee: BigInt(order.relayer_fee),
                    };

                    const formattedOrder = {
                        id: order.id,
                        intent_id: order.intent_id,
                        trading_pair_id: order.trading_pair_id,
                        side: order.side,
                        price: order.price,
                        quantity: order.quantity,
                        order_type: order.order_type,
                        pair: order.pair || null, // Ensure pair is not undefined
                        intent: normalizedIntent, // Use the normalized intent
                        signature: order.signature
                    };

                    if (!formattedOrder.trading_pair_id || formattedOrder.trading_pair_id.length !== 36) {
                        console.error("[Worker] Invalid or missing UUID detected for trading_pair_id:", formattedOrder.trading_pair_id);
                        await this.supabase.from('orders').update({ status: 'failed', last_error: 'Invalid trading_pair_id' }).eq('id', order.id);
                        continue;
                    }

                    console.log("[Worker] Sending normalized order to engine with pairId:", formattedOrder.trading_pair_id);
                    await this.matchingEngine.processOrder(formattedOrder);

                } catch (e: any) {
                    console.error(`[Worker] Failed to process order ${order.id}:`, e);
                    await this.supabase
                        .from('orders')
                        .update({ status: 'failed', last_error: e.message })
                        .eq('id', order.id);
                }
            }
        }
    }
}
