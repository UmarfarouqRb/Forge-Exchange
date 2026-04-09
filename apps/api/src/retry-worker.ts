import { createClient } from '@supabase/supabase-js';
import { forwardOrderToRelayer } from './orders';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Retry every 10 seconds
const RETRY_INTERVAL = 10000; 

async function retryPendingOrders() {
    console.log('[RetryWorker] Checking for pending orders to resend...');

    const { data: pendingOrders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending');

    if (error) {
        console.error('[RetryWorker] CRITICAL: Error fetching pending orders:', error);
        return;
    }

    if (pendingOrders && pendingOrders.length > 0) {
        console.log(`[RetryWorker] Found ${pendingOrders.length} pending orders. Attempting to forward them now...`);
        
        // Create a promise for each order forwarding attempt
        const retryPromises = pendingOrders.map(order => {
            // forwardOrderToRelayer is fire-and-forget, but we can still handle its immediate outcome
            return forwardOrderToRelayer(order).catch(err => {
                console.error(`[RetryWorker] Error while forwarding order ${order.id}:`, err.message);
            });
        });

        await Promise.all(retryPromises);

    } else {
        // This is a normal state, no need to log every time.
        // console.log('[RetryWorker] No pending orders found.');
    }
}

export function startRetryWorker() {
    console.log('[RetryWorker] Starting retry worker to process pending orders.');
    // Run immediately on start
    retryPendingOrders();
    // Then run on a set interval
    setInterval(retryPendingOrders, RETRY_INTERVAL);
}
