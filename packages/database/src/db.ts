
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from "drizzle-orm";

import * as schema from './schema';
import { Order, orders } from './schema';

// --- PostgreSQL (Supabase) Client ---

// IMPORTANT: These environment variables must be set for the server to connect to Supabase.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set.');
}

// Standard Supabase client
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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

export const getOrders = async (address: string) => {
    return db.select().from(orders).where(eq(orders.user, address));
};

export const getOrdersByPair = async (pair: string) => {
    return db.select().from(orders).where(eq(orders.pair, pair));
};

export const saveOrder = async (order: Order) => {
    return db.insert(orders).values(order);
};

export const updateOrderStatus = async (orderId: string, status: 'open' | 'filled' | 'canceled') => {
    return db.update(orders).set({ status }).where(eq(orders.id, orderId));
};
