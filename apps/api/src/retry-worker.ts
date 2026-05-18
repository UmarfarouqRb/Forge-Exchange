import { createClient } from '@supabase/supabase-js';
import { forwardOrderToRelayer } from './orders';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Retry every 10 seconds
const RETRY_INTERVAL = 10000; 
const MAX_RETRIES = 5;

async function retryOrders() {
    console.log('[RetryWorker] Checking for orders to retry...');

    const { data: ordersToRetry, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'processing'])
        .lt('retry_count', MAX_RETRIES);

    if (error) {
        console.error('[RetryWorker] CRITICAL: Error fetching orders to retry:', error);
        return;
    }

    if (ordersToRetry && ordersToRetry.length > 0) {
        console.log(`[RetryWorker] Found ${ordersToRetry.length} orders to retry. Forwarding...`);
        
        const retryPromises = ordersToRetry.map(async (order) => {
            try {
                // Increment retry count before forwarding
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({ retry_count: (order.retry_count || 0) + 1 })
                    .eq('id', order.id);

                if (updateError) {
                    throw new Error(`Failed to update retry_count for order ${order.id}: ${updateError.message}`);
                }

                await forwardOrderToRelayer(order);

            } catch (err) {
                console.error(`[RetryWorker] Error while forwarding order ${order.id}:`, (err as Error).message);
            }
        });

        await Promise.all(retryPromises);
    }
}

async function handleDeadOrders() {
    console.log('[RetryWorker] Checking for dead orders...');

    const { data: deadOrders, error } = await supabase
        .from('orders')
        .select('id')
        .gte('retry_count', MAX_RETRIES)
        .in('status', ['pending', 'processing', 'failed']); // Also catch 'failed' orders stuck in retry

    if (error) {
        console.error('[RetryWorker] CRITICAL: Error fetching dead orders:', error);
        return;
    }

    if (deadOrders && deadOrders.length > 0) {
        const deadOrderIds = deadOrders.map(o => o.id);
        console.log(`[RetryWorker] Found ${deadOrderIds.length} dead orders. Moving to dead_letter status.`);
        
        const { error: updateError } = await supabase
            .from('orders')
            .update({ status: 'dead_letter', last_error: 'Exceeded max retry limit.' })
            .in('id', deadOrderIds);

        if (updateError) {
            console.error('[RetryWorker] CRITICAL: Error moving orders to dead_letter:', updateError);
        }
    }
}


export function startRetryWorker() {
    console.log(`[RetryWorker] Starting worker. Retries every ${RETRY_INTERVAL / 1000}s. Max retries: ${MAX_RETRIES}.`);
    
    // Run checks immediately on start
    retryOrders();
    handleDeadOrders();

    // Then run on a set interval
    setInterval(() => {
        retryOrders();
        handleDeadOrders();
    }, RETRY_INTERVAL);
}
