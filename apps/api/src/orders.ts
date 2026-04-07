
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

export async function createOrder(orderData: any) {
    const { 
        intent,
        signature, 
        tradingPairId,
        side,
        orderType,
        price: initialPrice,
        quantity,
    } = orderData;

    const intentId = crypto.randomUUID();
    const userAddress = intent.user;

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

    const isValid = await verifyTypedData({
        address: userAddress as `0x${string}`,
        domain,
        types,
        primaryType: 'SwapIntent',
        message,
        signature,
    });

    if (!isValid) {
        throw new Error('Invalid signature');
    }

    // Handle market order price
    let finalPrice = initialPrice;
    if (orderType === 'market') {
        finalPrice = null;
    }

    // 2. Reconstruct payload for Relayer
    const intentForRelayer = {
        id: intentId,
        chainId: chainId,
        ...intent,
    };

    const payloadForRelayer = {
      intent: intentForRelayer,
      signature: signature,
      side: side,
      orderType: orderType,
    };

    // 2. Forward: Send the order to the Relayer for execution.
    try {
        const relayerResponse = await fetch(`${RELAYER_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadForRelayer, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ),
        });

        if (!relayerResponse.ok) {
            // Log the error from the relayer but continue to save the order as PENDING
            const errorBody = await relayerResponse.json();
            console.error(`[API] Relayer rejected order, but proceeding to save as open. Reason: ${JSON.stringify(errorBody)}`);
        } else {
            console.log('[API] Order successfully forwarded to Relayer.');
        }
    } catch (error) {
        console.error("[API] Failed to forward order to Relayer, but proceeding to save as open.", error);
    }

    // 3. Persist: Save the intent to the database with a 'open' status.
    const { data: newOrder, error } = await supabase
        .from('orders')
        .insert([{
            intent_id: intentId,
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
            amount_in: intent.amountIn,
            min_amount_out: intent.minAmountOut,
            deadline: intent.deadline,
            nonce: intent.nonce,
            adapter: intent.adapter,
            relayer_fee: intent.relayerFee,
        }])
        .select('*')
        .single();

    if (error) {
        console.error("Failed to create order:", error);
        throw new Error('Failed to create order');
    }

    console.log(`[API] Order ${newOrder.id} persisted with open status.`);

    return newOrder;
}

export async function getOrdersByAccount(walletAddress: string) {
    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            *,
            trading_pair: (
                *,
                base_token: (*),
                quote_token: (*)
            )
        `)
        .eq('user_address', walletAddress)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Failed to fetch orders:", error);
        throw new Error('Failed to fetch orders');
    }

    return orders;
}
