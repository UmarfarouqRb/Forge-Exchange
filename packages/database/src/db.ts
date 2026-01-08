
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
);

export interface Order {
    id: string;
    user: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minAmountOut: string;
    nonce: number;
    status: string;
    symbol: string;
    side: string;
    price: string;
    amount: string;
    total: string;
    createdAt: number;
}

export const getChainId = async () => {
    const { data, error } = await supabase.from('chain').select('id').single();
    if (error) throw error;
    return data.id;
};

export const getUserAddress = async () => {
    const { data, error } = await supabase.from('users').select('address').single();
    if (error) throw error;
    return data.address;
};

export const saveSession = async (sessionKey: string, expiration: number) => {
    const { error } = await supabase.from('sessions').insert([{ sessionKey, expiration }]);
    if (error) throw error;
};

export const getOrders = async (address: string): Promise<Order[]> => {
    const { data, error } = await supabase.from('orders').select('*').eq('user', address);
    if (error) throw error;
    return data as Order[];
};

export const saveOrder = async (intent: any) => {
    const { error } = await supabase.from('orders').insert([intent]);
    if (error) throw error;
};

export const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) throw error;
};
