import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '../../packages/shared-types/schema';

// --- PostgreSQL (Supabase) Client ---

// IMPORTANT: These environment variables must be set for the server to connect to Supabase.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

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
