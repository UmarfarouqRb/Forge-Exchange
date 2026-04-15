
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MatchingEngine } from './matching/engine';

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
                    // Increment retry count
                    await this.supabase
                        .from('orders')
                        .update({ retries: order.retries + 1, status: 'processing' })
                        .eq('id', order.id);

                    const formattedOrder = {
                        id: order.id,
                        intent_id: order.intent_id,
                        trading_pair_id: order.trading_pair_id,
                        side: order.side,
                        price: order.price,
                        quantity: order.quantity,
                        order_type: order.order_type,
                        pair: order.pair || null,
                        intent: {
                            user: order.user_address,
                            tokenIn: order.token_in,
                            tokenOut: order.token_out,
                            amountIn: order.amount_in,
                            minAmountOut: order.min_amount_out,
                            deadline: order.deadline,
                            nonce: order.nonce,
                            adapter: order.adapter,
                            relayerFee: order.relayer_fee,
                        },
                        signature: order.signature
                    };

                    if (!formattedOrder.trading_pair_id || formattedOrder.trading_pair_id.length !== 36) {
                        console.error(" [Worker] Invalid or missing UUID detected for trading_pair_id:", formattedOrder.trading_pair_id);
                        await this.supabase.from('orders').update({ status: 'failed', failure_reason: 'Invalid trading_pair_id' }).eq('id', order.id);
                        continue;
                    }

                    console.log(" [Worker] Sending clean order to engine with pairId:", formattedOrder.trading_pair_id);
                    await this.matchingEngine.processOrder(formattedOrder);

                } catch (e: any) {
                    console.error(`[Worker] Failed to process order ${order.id}:`, e);
                    await this.supabase
                        .from('orders')
                        .update({ status: 'failed', failure_reason: e.message })
                        .eq('id', order.id);
                }
            }
        }
    }
}
