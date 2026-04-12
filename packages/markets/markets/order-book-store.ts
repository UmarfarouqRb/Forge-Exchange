import { EventEmitter } from 'events';

export type AggregatedOrderBook = {
    bids: [string, string][];
    asks: [string, string][];
};

const store: Record<string, AggregatedOrderBook> = {};
const emitter = new EventEmitter();

/**
 * Sets the order book for a given pair and emits an update event.
 * @param pairId The ID of the trading pair.
 * @param book The aggregated order book.
 */
export function setBook(pairId: string, book: AggregatedOrderBook) {
    store[pairId] = book;
    emitter.emit('orderbook_update', { pairId, ...book });
}

/**
 * Retrieves the order book for a given pair from the in-memory store.
 * @param pairId The ID of the trading pair.
 * @returns The aggregated order book or undefined if not found.
 */
export function getBook(pairId: string): AggregatedOrderBook | undefined {
    return store[pairId];
}

/**
 * Emitter for order book update events.
 * Consumers can listen to 'orderbook_update'.
 */
export const orderBookEvents = emitter;
