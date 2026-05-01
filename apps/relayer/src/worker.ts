import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MatchingEngine } from './matching/engine';

export class RetryWorker {
    private supabase: SupabaseClient;
    private matchingEngine: MatchingEngine;
    private intervalId?: NodeJS.Timeout;
    private tvlIntervalId?: NodeJS.Timeout;

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
        this.tvlIntervalId = setInterval(() => this.takeTvlSnapshot(), 3600000); // Take a snapshot every hour
    }

    stop() {
        console.log('Stopping Retry Worker...');
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        if (this.tvlIntervalId) {
            clearInterval(this.tvlIntervalId);
        }
    }

    private async takeTvlSnapshot() {
        console.log('Taking TVL snapshot...');
        const { data, error } = await this.supabase.rpc('calculate_tvl');
        if (error) {
            console.error('[Worker] Error taking TVL snapshot:', error);
            return;
        }

        await this.supabase.from('tvl_snapshots').insert({ tvl_usd: data });
    }

    private async processRetries() {
        const { data: orders, error } = await this.supabase
            .from('orders')
            .select('*')
            .eq('status', 'pending') // Only pick up orders that haven't been touched yet
            .lt('retry_count', 3);    // Limit retries

        if (error) {
            console.error('[Worker] Error fetching retryable orders:', error);
            return;
        }

        if (orders && orders.length > 0) {
            console.log(`[Worker] Found ${orders.length} orders to process.`);
            for (const order of orders) {
                try {
                    // Mark as processing and increment retry count
                    const { error: updateError } = await this.supabase
                        .from('orders')
                        .update({ 
                            retry_count: (order.retry_count || 0) + 1, 
                            status: 'processing',
                            last_attempt_at: new Date().toISOString()
                        })
                        .eq('id', order.id);

                    if (updateError) {
                        console.error(`[Worker] Failed to mark order ${order.id} as processing:`, updateError);
                        continue; // Skip this order
                    }

                    // The Matching Engine now expects the raw DB order and will format it internally.
                    console.log(`[Worker] Sending order ${order.id} to the Matching Engine.`);
                    await this.matchingEngine.processOrder(order);

                } catch (e: any) {
                    console.error(`[Worker] Unhandled error processing order ${order.id}:`, e);
                    await this.supabase
                        .from('orders')
                        .update({ status: 'failed', last_error: `Worker Error: ${e.message}` })
                        .eq('id', order.id);
                }
            }
        }
    }
}
