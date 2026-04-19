import { verifyTypedData, isAddress, getAddress } from 'viem';
import { createClient } from '@supabase/supabase-js';
import { INTENT_SPOT_ROUTER_ADDRESS } from '@forge/contracts';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { broadcastToTopic } from '../websocket';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const chainId = 84532; // Base Sepolia
const RELAYER_URL = process.env.RELAYER_URL || 'http://localhost:3000';

// EIP-712 Domain for an Intent
const domain = {
    name: 'Forge Exchange',
    version: '1',
    chainId: chainId,
    verifyingContract: getAddress(INTENT_SPOT_ROUTER_ADDRESS[chainId] as `0x${string}`),
};

// EIP-712 Types for an Intent
const types = {
    SwapIntent: [
        { name: 'user', type: 'address' },
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'minAmountOut', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'adapter', type: 'address' },
        { name: 'relayerFee', type: 'uint256' },
    ],
} as const;

// Helper to create a more detailed error
function createError(message: string, details?: any): Error {
    const error = new Error(message);
    if (details) {
        (error as any).details = details;
    }
    return error;
}

// Helper to emit an event to the user via WebSocket
async function emitOrderUpdate(order: any, eventType: 'success' | 'failure' | 'info', message: string) {
    const topic = `orders:${order.user_address}`;
    const payload = {
        type: 'order_update',
        orderId: order.intent_id,
        status: eventType,
        message,
    };
    broadcastToTopic(topic, payload);
}

let lastCall = 0;

async function rateLimitedFetch(url: string, options: any) {
    const now = Date.now();
    const MIN_DELAY = 500; // 0.5 sec

    const timeSinceLastCall = now - lastCall;
    if (timeSinceLastCall < MIN_DELAY) {
        await new Promise(res => setTimeout(res, MIN_DELAY - timeSinceLastCall));
    }

    lastCall = Date.now();
    return fetch(url, options);
}

// This function will be used by the API endpoint and the retry worker
export async function forwardOrderToRelayer(order: any): Promise<void> {
    console.log(`[API] Preparing to forward order ${order.intent_id} to relayer...`);

    const { data: pairData, error: pairError } = await supabase
        .from('trading_pairs')
        .select(`
            *,
            base_token:tokens!trading_pairs_base_token_id_fkey (*),
            quote_token:tokens!trading_pairs_quote_token_id_fkey (*)
        `)
        .eq('id', order.trading_pair_id)
        .single();

    if (pairError || !pairData) {
        throw new Error(`Could not fetch pair data for order ${order.intent_id}`);
    }

    const payloadForRelayer = {
        intent_id: order.intent_id, // Keep ID at top level
        intent: {
            user: getAddress(order.user_address),
            tokenIn: getAddress(order.token_in),
            tokenOut: getAddress(order.token_out),
            amountIn: BigInt(order.amount_in),
            minAmountOut: BigInt(order.min_amount_out),
            deadline: BigInt(order.deadline),
            nonce: BigInt(order.nonce),
            adapter: getAddress(order.adapter),
            relayerFee: BigInt(order.relayer_fee),
        },
        signature: order.signature,
        side: order.side,
        order_type: order.order_type,
        trading_pair_id: order.trading_pair_id,
        quantity: order.quantity,
        price: order.price,
        pair: pairData,
    };

    try {
        const res = await rateLimitedFetch(`${RELAYER_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadForRelayer, (_, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ),
        });

        if (res.ok) {
            console.log(`[API] Order ${order.intent_id} successfully accepted by relayer.`);
            await supabase
                .from('orders')
                .update({ status: 'processing' })
                .eq('id', order.id);
            // Emit success event
            await emitOrderUpdate(order, 'success', 'Order successfully sent to the solver');
        } else {
            if (res.status === 429) {
                console.warn(`[API] Relayer rate limited for order ${order.intent_id}. Order will be retried.`);
                throw new Error('RATE_LIMITED');
            }
            const errorBody = await res.text();
            console.error(`[API] Relayer rejected order ${order.intent_id} with status ${res.status}:`, errorBody);
            throw new Error(`Relayer rejected order: ${errorBody}`);
        }
    } catch (err: any) {
        console.error(`[API] Failed to forward order ${order.intent_id} to relayer:`, err.message);
        // Re-throw the error so the calling function can handle it.
        throw err;
    }
}

export async function createOrder(orderData: any) {
    const { 
        intent,
        signature, 
        tradingPairId: initialTradingPairId, // This might be a symbol or a UUID
        side,
        orderType,
        price: initialPrice,
        quantity,
    } = orderData;

    if (!intent || !intent.user) {
        throw createError("Invalid intent: missing user", { intent });
    }
    
    if (!isAddress(intent.user)) {
        throw createError("Invalid user address format");
    }

    const orderId = crypto.randomUUID();
    
    const messageToVerify = {
        user: intent.user,
        tokenIn: intent.tokenIn,
        tokenOut: intent.tokenOut,
        amountIn: intent.amountIn,
        minAmountOut: intent.minAmountOut,
        deadline: intent.deadline,
        nonce: intent.nonce,
        adapter: intent.adapter,
        relayerFee: intent.relayerFee,
    };
    
    const userAddress = intent.user as `0x${string}`;

    // 1. Resolve tradingPairId: Check if it's a symbol and convert to UUID if so
    let tradingPairId = initialTradingPairId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tradingPairId)) {
        const { data: pair, error: pairError } = await supabase
            .from('trading_pairs')
            .select('id')
            .eq('symbol', tradingPairId)
            .single();
        if (pairError || !pair) {
            throw createError(`Trading pair not found for symbol: ${tradingPairId}`, pairError);
        }
        tradingPairId = pair.id;
    }

    // 2. Verify Signature with raw, unmodified data
    console.log("VERIFY PAYLOAD", messageToVerify);
    const isValid = await verifyTypedData({
        address: userAddress,
        domain,
        types,
        primaryType: 'SwapIntent',
        message: messageToVerify,
        signature,
    });

    if (!isValid) {
        throw createError('Invalid signature');
    }
    
    // 3. Normalize data AFTER verification
    const normalizedIntent = {
        user: getAddress(messageToVerify.user),
        tokenIn: getAddress(messageToVerify.tokenIn),
        tokenOut: getAddress(messageToVerify.tokenOut),
        adapter: getAddress(messageToVerify.adapter),
        amountIn: BigInt(messageToVerify.amountIn),
        minAmountOut: BigInt(messageToVerify.minAmountOut),
        deadline: BigInt(messageToVerify.deadline),
        nonce: BigInt(messageToVerify.nonce),
        relayerFee: BigInt(messageToVerify.relayerFee),
    };


    // 4. Save FIRST with 'pending' status
    // Use the normalized and verified data to ensure DB consistency.
    const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert([{
            id: crypto.randomUUID(),
            intent_id: orderId,
            user_address: normalizedIntent.user,
            trading_pair_id: tradingPairId,
            side,
            order_type: orderType, 
            quantity: quantity,
            price: orderType === 'market' ? null : initialPrice,
            status: 'pending', // <-- SAVE AS PENDING
            signature,
            token_in: normalizedIntent.tokenIn,
            token_out: normalizedIntent.tokenOut,
            amount_in: String(normalizedIntent.amountIn),
            min_amount_out: String(normalizedIntent.minAmountOut),
            deadline: String(normalizedIntent.deadline),
            nonce: String(normalizedIntent.nonce),
            adapter: normalizedIntent.adapter,
            relayer_fee: String(normalizedIntent.relayerFee),
        }])
        .select('*')
        .single();

    if (insertError) {
        console.error("[API] CRITICAL: Failed to save initial order to DB!", insertError);
        throw createError(`Failed to save order to database: ${insertError.message}`);
    }

    // 5. Handle forwarding based on order type
    if (orderType === 'market') {
        try {
            await forwardOrderToRelayer(newOrder);
        } catch (forwardError: any) {
            if (forwardError.message === 'RATE_LIMITED') {
                console.log(`[API] Market order ${newOrder.id} was rate limited. Keeping status as 'pending' for retry.`);
                await supabase.from('orders').update({
                    status: 'pending',
                    retry_count: (newOrder.retry_count || 0) + 1,
                    last_error: 'Rate limited',
                    last_attempt_at: new Date().toISOString()
                }).eq('id', newOrder.id);
                // Do not throw an error, let the user know it's pending.
                // The worker will pick it up.
                await emitOrderUpdate(newOrder, 'info', 'Your order was received and will be processed shortly.');
            } else {
                console.error(`[API] Failed to process market order ${newOrder.id}. Setting to failed.`, forwardError);
                const { error: updateError } = await supabase.from('orders').update({
                    status: 'failed',
                    last_error: 'Failed to forward to relayer'
                }).eq('id', newOrder.id);
                
                if (updateError) {
                     console.error(`[API] CRITICAL: Failed to update order status to failed for order ${newOrder.id}`, updateError);
                }
    
                // Emit failure event
                await emitOrderUpdate(newOrder, 'failure', 'Failed to send order');
                
                throw createError(`Market order failed: ${forwardError.message}`);
            }
        }
    } else {
        // For limit/stop orders, we still await but handle errors gracefully
        try {
            await forwardOrderToRelayer(newOrder);
        } catch (err: any) {
            // If rate-limited, we just log it. The order is already 'pending'.
            // The worker will handle retries.
            if (err.message === 'RATE_LIMITED') {
                 console.log(`[API] Limit order ${newOrder.id} was rate limited on initial forward. Worker will handle it.`);
            } else {
                // For other errors, it's also non-critical for the user response.
                console.warn(`[API] Non-critical failure to forward limit order ${newOrder.id}. Worker will retry.`, err);
            }
        }
    }

    // 6. Return response to user
    console.log(`[API] Order ${newOrder.id} processed for creation.`);
    return newOrder;
}


export async function getOrdersByAccount(walletAddress: string) {
    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          trading_pair:trading_pairs (
            *,
            base_token:tokens!trading_pairs_base_token_id_fkey (*),
            quote_token:tokens!trading_pairs_quote_token_id_fkey (*)
          )
        `)
        .eq('user_address', walletAddress)
        .order('created_at', { ascending: false });

    if (error) {
        throw createError(`Failed to fetch orders: ${error.message}`, error);
    }

    return orders;
}
