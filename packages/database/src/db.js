import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_KEY || '');
export const getChainId = async () => {
    const { data, error } = await supabase.from('chain').select('id').single();
    if (error)
        throw error;
    return data.id;
};
export const getUserAddress = async () => {
    const { data, error } = await supabase.from('users').select('address').single();
    if (error)
        throw error;
    return data.address;
};
export const saveSession = async (sessionKey, expiration) => {
    const { error } = await supabase.from('sessions').insert([{ sessionKey, expiration }]);
    if (error)
        throw error;
};
export const getOrders = async (address) => {
    const { data, error } = await supabase.from('orders').select('*').eq('user', address);
    if (error)
        throw error;
    return data;
};
export const saveOrder = async (intent) => {
    const { error } = await supabase.from('orders').insert([intent]);
    if (error)
        throw error;
};
export const updateOrderStatus = async (orderId, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error)
        throw error;
};
