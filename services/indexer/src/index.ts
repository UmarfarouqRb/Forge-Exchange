
import { createPublicClient, http, Log, Transport } from "viem";
import { base } from "viem/chains";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import pino from 'pino';
import { and, eq, sql, desc } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { processLog } from './processors';

import {
    VAULT_SPOT_ADDRESS,
    SPOT_ROUTER_ADDRESS,
    AllEventsABI
} from './config';

// --- 1. SETUP ---
const logger = pino({ level: 'info' });

// Use a dedicated RPC URL from a paid provider for production
const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

const transport: Transport = http(rpcUrl);
const publicClient = createPublicClient({
    chain: base,
    transport,
});

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}

const db = drizzle(postgres(process.env.DATABASE_URL), { schema });

// --- 2. CONSTANTS ---
const CONFIRMATIONS = 12n;
const REORG_BUFFER = 50n;
const SCAN_RANGE = 2000n;

// --- 3. DATABASE CHECKPOINTS ---

async function getCheckpoint(): Promise<bigint> {
    const result = await db.query.indexerCheckpoints.findFirst();
    return result ? BigInt(result.lastProcessedBlock) : 0n;
}

async function setCheckpoint(blockNumber: bigint): Promise<void> {
    await db.insert(schema.indexerCheckpoints)
        .values({ id: 'singleton', lastProcessedBlock: blockNumber.toString() })
        .onConflictDoUpdate({ target: schema.indexerCheckpoints.id, set: { lastProcessedBlock: blockNumber.toString() } });
}

// --- 4. LOG FETCHING ---

async function fetchAndProcessLogs(fromBlock: bigint, toBlock: bigint): Promise<void> {
    if (fromBlock > toBlock) {
        logger.info("No new blocks to process.");
        return;
    }

    logger.info(`Scanning blocks from ${fromBlock} to ${toBlock}...`);

    const logs = await publicClient.getLogs({
        address: [VAULT_SPOT_ADDRESS, SPOT_ROUTER_ADDRESS],
        events: AllEventsABI,
        fromBlock,
        toBlock,
    });

    logger.info(`Found ${logs.length} events in range.`);

    if (logs.length === 0) {
        return;
    }

    await db.transaction(async (tx) => {
        for (const log of logs) {
            if (log.removed) {
                logger.warn({ log }, "Skipping re-orged log.");
                continue;
            }
            // Delegate processing to the dedicated function
            await processLog(log as any, tx as any);
        }
    });
}

// --- 5. MAIN INDEXER LOOP ---

async function main() {
    logger.info("Starting indexer...");

    while (true) {
        try {
            const latestBlock = await publicClient.getBlockNumber();
            const safeToBlock = latestBlock - CONFIRMATIONS;

            const lastCheckpoint = await getCheckpoint();

            const fromBlock = lastCheckpoint > REORG_BUFFER ? lastCheckpoint - REORG_BUFFER : 0n;
            const toBlock = safeToBlock > fromBlock + SCAN_RANGE ? fromBlock + SCAN_RANGE : safeToBlock;

            if (fromBlock >= toBlock) {
                logger.info('Indexer is up to date. Waiting for new blocks...');
                await new Promise(resolve => setTimeout(resolve, 5000)); // 5-second wait
                continue;
            }

            await fetchAndProcessLogs(fromBlock, toBlock);

            await setCheckpoint(toBlock);

            logger.info(`Successfully processed blocks up to ${toBlock}.`);

        } catch (error) {
            logger.error({ err: error }, "An error occurred in the main indexer loop. Retrying in 10 seconds...");
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
}

main().catch(err => {
    logger.error({ err }, "Indexer failed to start.");
    process.exit(1);
});
