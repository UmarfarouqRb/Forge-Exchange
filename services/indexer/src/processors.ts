import { Log } from "viem";
import { PostgresJsTransaction } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm'; // Import 'eq'
import pino from 'pino';
import * as schema from '@shared/schema';
import { RawOnchainEvent } from '@shared/schema';
import { AllEventsABI } from './config';

const logger = pino({ level: 'info' });

/**
 * Processes a single log event and inserts it into the database.
 * This function acts as a router to dispatch logs to their specific handlers.
 *
 * @param log The raw log object from viem.
 * @param tx The Drizzle database transaction instance.
 */
export async function processLog(
    log: Log<bigint, number, typeof AllEventsABI[number]>,
    tx: PostgresJsTransaction<typeof schema, Record<string, never>>
) {
    // Safely extract eventName and args with type inference from viem's Log type
    const eventName = log.eventName;
    const args = log.args;
    const { blockNumber, logIndex, transactionHash, address } = log;

    if (!blockNumber || !transactionHash) {
        logger.warn({ log }, "Skipping log with no blockNumber or transactionHash");
        return;
    }

    const block = await tx.query.blocks.findFirst({ where: eq(schema.blocks.number, blockNumber) });
    const blockTimestamp = block ? block.timestamp : new Date(0); // Fallback for safety

    const newEvent: Omit<RawOnchainEvent, 'id' | 'isProcessed' | 'createdAt'> = {
        txHash: transactionHash,
        logIndex,
        blockNumber,
        blockTimestamp,
        contractAddress: address.toLowerCase(),
        eventName: eventName,
        parameters: args as any, // Drizzle has limitations with complex JSON types, so we cast to `any`
    };

    // Idempotently insert the event. If it already exists, do nothing.
    await tx.insert(schema.RawOnchainEvent).values(newEvent as RawOnchainEvent).onConflictDoNothing();

    logger.info({ eventName, blockNumber, transactionHash }, `Stored raw event: ${eventName}`);
}