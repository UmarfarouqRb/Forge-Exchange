
import { verifyTypedData } from 'viem';
import { createClient } from '@supabase/supabase-js';
import { INTENT_SPOT_ROUTER_ADDRESS } from '../../frontend/src/config/contracts';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const chainId = 84532; // Base Sepolia

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
        signature, 
        tradingPairId,
        side,
        orderType,
        userAddress,
        ...intent 
    } = orderData;

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

    // 2. Persist: Save the intent to the database with a 'PENDING' status.
    const { data: newOrder, error } = await supabase
        .from('orders')
        .insert([{
            user_address: userAddress,
            trading_pair_id: tradingPairId,
            side,
            order_type: orderType,
            quantity: intent.quantity,
            price: intent.price,
            status: 'PENDING',
            signature,
            token_in: intent.tokenIn,
            token_out: intent.tokenOut,
            amount_in: intent.amountIn,
            min_amount_out: intent.minAmountOut,
            deadline: intent.deadline,
            nonce: intent.nonce,
        }])
        .select('*')
        .single();

    if (error) {
        console.error("Failed to create order:", error);
        throw new Error('Failed to create order');
    }

    // 3. Emit: This is where we'd notify the relayer.
    // In a microservice architecture, this would publish to a message queue (e.g., Redis).
    console.log(`[API] Order ${newOrder.id} persisted. Relaying to matching engine.`);
    // await publishOrderToQueue(newOrder); // Conceptual function

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
