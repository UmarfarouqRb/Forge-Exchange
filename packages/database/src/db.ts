import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';
import { Order } from './schema';

// --- PostgreSQL (Supabase) Client ---

// IMPORTANT: These environment variables must be set for the server to connect to Supabase.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY) are not set.');
}

// Standard Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Drizzle ORM client for type-safe SQL queries
// We use this for our application logic
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.');
}
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// --- Redis (Upstash) Client ---

// IMPORTANT: These environment variables must be set for the server to connect to Redis.
const redisUrl = process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error('Upstash Redis environment variables (UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN) are not set.');
}

export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});


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
