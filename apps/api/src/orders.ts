import { verifyTypedData, isAddress, getAddress } from 'viem';
import { createClient } from '@supabase/supabase-js';
import { INTENT_SPOT_ROUTER_ADDRESS } from '@forge/contracts';
import fetch from 'node-fetch';
import crypto from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const chainId = 84532; // Base Sepolia
const RELAYER_URL = process.env.RELAYER_URL || 'http://localhost:3000';

// EIP-712 Domain for an Intent
const domain = {
    name: 'IntentSpotRouter',
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

// This function will be used by the API endpoint and the retry worker
export async function forwardOrderToRelayer(order: any) {
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
        intent: {
            id: order.intent_id,
            chainId,
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
        signature: order.signature,
        side: order.side,
        order_type: order.order_type,
        tradingPairId: order.trading_pair_id,
        quantity: order.quantity,
        price: order.price,
        pair: pairData,
    };

    fetch(`${RELAYER_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadForRelayer),
    })
    .then(async (res) => {
        if (res.ok) {
            console.log(`[API] Order ${order.intent_id} successfully accepted by relayer.`);
            // Optionally update status to 'processing'
            await supabase
                .from('orders')
                .update({ status: 'processing' })
                .eq('id', order.id);
        } else {
            const errorBody = await res.text();
            console.error(`[API] Relayer rejected order ${order.intent_id} with status ${res.status}:`, errorBody);
        }
    })
    .catch((err) => {
        console.error(`[API] Failed to forward order ${order.intent_id} to relayer:`, err.message);
        // The order remains in 'pending' state and will be picked up by the retry worker.
    });
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
    const userAddress = intent.user;

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

    // 2. Verify Signature
    const isValid = await verifyTypedData({
        address: userAddress as `0x${string}`,
        domain,
        types,
        primaryType: 'SwapIntent',
        message: {
            user: userAddress,
            tokenIn: intent.tokenIn,
            tokenOut: intent.tokenOut,
            amountIn: BigInt(intent.amountIn),
            minAmountOut: BigInt(intent.minAmountOut),
            deadline: BigInt(intent.deadline),
            nonce: BigInt(intent.nonce),
            adapter: intent.adapter,
            relayerFee: BigInt(intent.relayerFee),
        },
        signature,
    });

    if (!isValid) {
        throw createError('Invalid signature');
    }

    // 3. Save FIRST with 'pending' status
    const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert([{
            id: crypto.randomUUID(),
            intent_id: orderId,
            user_address: userAddress,
            trading_pair_id: tradingPairId,
            side,
            order_type: orderType, // Corrected column name
            quantity: quantity,
            price: orderType === 'market' ? null : initialPrice,
            status: 'pending', // <-- SAVE AS PENDING
            signature,
            token_in: intent.tokenIn,
            token_out: intent.tokenOut,
            amount_in: String(intent.amountIn),
            min_amount_out: String(intent.minAmountOut),
            deadline: String(intent.deadline),
            nonce: String(intent.nonce),
            adapter: intent.adapter,
            relayer_fee: String(intent.relayerFee),
        }])
        .select('*')
        .single();

    if (insertError) {
        console.error("[API] CRITICAL: Failed to save initial order to DB!", insertError);
        throw createError(`Failed to save order to database: ${insertError.message}`);
    }

    // 4. Fire-and-forget call to relayer
    forwardOrderToRelayer(newOrder);

    // 5. Return response to user immediately
    console.log(`[API] Order ${newOrder.id} saved as pending and initiated for processing.`);
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
