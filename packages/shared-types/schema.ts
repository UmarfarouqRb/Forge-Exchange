
import { pgTable, serial, text, timestamp, integer, bigint, boolean, jsonb } from 'drizzle-orm/pg-core';

// A table to store block information, allowing us to link events to a specific block time.
export const blocks = pgTable("blocks", {
    number: bigint("number", { mode: 'bigint' }).primaryKey(),
    timestamp: timestamp("timestamp").notNull(),
});

export const indexerCheckpoints = pgTable("indexer_checkpoints", {
    id: text("id").primaryKey(),
    lastProcessedBlock: text("last_processed_block").notNull(),
});

export const RawOnchainEvent = pgTable("raw_onchain_events", {
    id: serial("id").primaryKey(),
    txHash: text("tx_hash").notNull(),
    logIndex: integer("log_index").notNull(),
    blockNumber: bigint("block_number", { mode: 'bigint' }).notNull(),
    blockTimestamp: timestamp("block_timestamp").notNull(),
    contractAddress: text("contract_address").notNull(),
    eventName: text("event_name").notNull(),
    parameters: jsonb("parameters").notNull(),
    isProcessed: boolean("is_processed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RawOnchainEvent = typeof RawOnchainEvent.$inferSelect;
