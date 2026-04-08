import { verifyTypedData } from 'viem';
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
    verifyingContract: INTENT_SPOT_ROUTER_ADDRESS[chainId] as `0x${string}`,
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

export async function createOrder(orderData: any) {
    const { 
        intent,
        signature, 
        tradingPairId: initialTradingPairId,
        side,
        orderType,
        price: initialPrice,
        quantity,
    } = orderData;

    console.log("[API] Incoming intent:", JSON.stringify(intent, null, 2));

    if (!intent || !intent.user) {
        throw createError("Invalid intent: missing user", { intent });
    }

    const orderId = crypto.randomUUID();
    const userAddress = intent.user;

    // Resolve tradingPairId if it's a symbol
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

    // 1. Validation: Verify the EIP-712 signature
    const message = {
        user: userAddress,
        tokenIn: intent.tokenIn,
        tokenOut: intent.tokenOut,
        amountIn: BigInt(intent.amountIn),
        minAmountOut: BigInt(intent.minAmountOut),
        deadline: BigInt(intent.deadline),
        nonce: BigInt(intent.nonce),
        adapter: intent.adapter,
        relayerFee: BigInt(intent.relayerFee),
    };

    let isValid = false;
    try {
        isValid = await verifyTypedData({
            address: userAddress as `0x${string}`,
            domain,
            types,
            primaryType: 'SwapIntent',
            message,
            signature,
        });
    } catch (e: any) {
        console.error("Error during signature verification:", e);
        throw createError(`Signature verification failed: ${e.message}`, e);
    }

    if (!isValid) {
        throw createError('Invalid signature');
    }

    // Handle market order price
    let finalPrice = initialPrice;
    if (orderType === 'market') {
        finalPrice = null;
    }

    // 2. Reconstruct payload for Relayer
    const intentForRelayer = {
        id: orderId,
        chainId,
        user: intent.user,
        tokenIn: intent.tokenIn,
        tokenOut: intent.tokenOut,
        amountIn: String(intent.amountIn),
        minAmountOut: String(intent.minAmountOut),
        deadline: String(intent.deadline),
        nonce: String(intent.nonce),
        adapter: intent.adapter,
        relayerFee: String(intent.relayerFee),
    };

    if (!intentForRelayer.id) {
        throw createError("Intent ID missing before relayer");
    }

    const payloadForRelayer = {
      intent: intentForRelayer,
      signature: signature,
      side: side,
      orderType: orderType,
    };

    console.log("[API] Forwarding payload to relayer:", JSON.stringify(payloadForRelayer, null, 2));

    // 2. Forward: Send the order to the Relayer for execution.
    try {
        const relayerResponse = await fetch(`${RELAYER_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadForRelayer),
        });

        if (!relayerResponse.ok) {
            const errorBody = await relayerResponse.json();
            console.error(`[API] Relayer rejected order, but proceeding to save as open. Reason: ${JSON.stringify(errorBody, null, 2)}`);
        } else {
            console.log('[API] Order successfully forwarded to Relayer.');
        }
    } catch (error: any) {
        console.error(`[API] Failed to forward order to Relayer, but proceeding to save as open. Error: ${error.message}`, error);
    }

    // 3. Persist: Save the intent to the database with a 'open' status.
    const { data: newOrder, error } = await supabase
        .from('orders')
        .insert([{
            id: crypto.randomUUID(),
            intent_id: orderId,
            user_address: userAddress,
            trading_pair_id: tradingPairId,
            side,
            order_type: orderType,
            quantity: quantity,
            price: finalPrice,
            status: 'open',
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

    if (error) {
        console.error("Failed to create order in database:", JSON.stringify(error, null, 2));
        throw createError(`Failed to create order: ${error.message}`, error);
    }

    console.log(`[API] Order ${newOrder.id} persisted with open status.`);

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
        console.error("Failed to fetch orders:", JSON.stringify(error, null, 2));
        throw createError(`Failed to fetch orders: ${error.message}`, error);
    }

    return orders;
}