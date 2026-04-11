import { createClient } from '@supabase/supabase-js';
import { MatchingEngine } from './matching/engine';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MAX_RETRIES = 5;
const PROCESSING_TIMEOUT_MS = 60 * 1000; // 1 minute

export class RetryWorker {
    private interval: NodeJS.Timeout | null = null;
    private isRunning = false;
    private matchingEngine: MatchingEngine;

    constructor(matchingEngine: MatchingEngine) {
        this.matchingEngine = matchingEngine;
    }

    start(pollingInterval: number = 5000) {
        console.log('[Worker] Starting retry worker...');
        this.interval = setInterval(() => this.processStaleOrders(), pollingInterval);
    }

    stop() {
        if (this.interval) {
            console.log('[Worker] Stopping retry worker...');
            clearInterval(this.interval);
        }
    }

    private async processStaleOrders() {
        if (this.isRunning) {
            console.log('[Worker] Previous batch still running, skipping this interval.');
            return;
        }
        this.isRunning = true;

        try {
            const timeout = new Date(Date.now() - PROCESSING_TIMEOUT_MS).toISOString();

            const { data: staleOrders, error } = await supabase
                .from('orders')
                .select('*')
                .or(`status.eq.pending,and(status.eq.processing,last_attempt_at.lt.${timeout})`)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('[Worker] Error fetching stale orders:', error);
                return;
            }

            if (!staleOrders || staleOrders.length === 0) {
                return;
            }

            console.log(`[Worker] Found ${staleOrders.length} stale orders to process.`);

            for (const order of staleOrders) {
                if ((order.retry_count || 0) >= MAX_RETRIES) {
                    await supabase
                        .from('orders')
                        .update({ status: 'failed', last_error: 'Exceeded max retry attempts' })
                        .eq('id', order.id);
                    continue;
                }

                try {
                     // Mark that we are attempting to process it
                    await supabase.from('orders').update({
                        last_attempt_at: new Date().toISOString()
                    }).eq('id', order.id);

                    await this.matchingEngine.processOrder(order);

                } catch (err: any) {
                    console.error(`[Worker] Error processing order ${order.id}:`, err);
                    await supabase
                        .from('orders')
                        .update({ 
                            status: 'pending', // Reset to pending for the next retry cycle
                            last_error: err.message,
                            retry_count: (order.retry_count || 0) + 1,
                        })
                        .eq('id', order.id);
                }
            }
        } catch (e) {
            console.error('[Worker] Unhandled error in processStaleOrders:', e);
        } finally {
            this.isRunning = false;
        }
    }
}
