"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawOnchainEvent = exports.indexerCheckpoints = exports.blocks = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// A table to store block information, allowing us to link events to a specific block time.
exports.blocks = (0, pg_core_1.pgTable)("blocks", {
    number: (0, pg_core_1.bigint)("number", { mode: 'bigint' }).primaryKey(),
    timestamp: (0, pg_core_1.timestamp)("timestamp").notNull(),
});
exports.indexerCheckpoints = (0, pg_core_1.pgTable)("indexer_checkpoints", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    lastProcessedBlock: (0, pg_core_1.text)("last_processed_block").notNull(),
});
exports.RawOnchainEvent = (0, pg_core_1.pgTable)("raw_onchain_events", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    txHash: (0, pg_core_1.text)("tx_hash").notNull(),
    logIndex: (0, pg_core_1.integer)("log_index").notNull(),
    blockNumber: (0, pg_core_1.bigint)("block_number", { mode: 'bigint' }).notNull(),
    blockTimestamp: (0, pg_core_1.timestamp)("block_timestamp").notNull(),
    contractAddress: (0, pg_core_1.text)("contract_address").notNull(),
    eventName: (0, pg_core_1.text)("event_name").notNull(),
    parameters: (0, pg_core_1.jsonb)("parameters").notNull(),
    isProcessed: (0, pg_core_1.boolean)("is_processed").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
