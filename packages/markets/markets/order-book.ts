import { getOrdersByPairId } from '@forge/db';

export type Order = {
    id: string;
    userAddress: string;
    tradingPairId: string;
    side: 'buy' | 'sell';
    price: string | null;
    quantity: string;
}

export type OrderBook = {
    bids: [string, string][];
    asks: [string, string][];
};

const syntheticPriceOffsets: { [pairId: string]: number } = {};
const SYNTHETIC_UPDATE_INTERVAL = 1000; 
let lastSyntheticUpdate: { [pairId: string]: number } = {};

function generateSyntheticDepth(midPrice: number, pairId: string): OrderBook {
    const now = Date.now();
    if (!lastSyntheticUpdate[pairId] || (now - lastSyntheticUpdate[pairId] > SYNTHETIC_UPDATE_INTERVAL)) {
        syntheticPriceOffsets[pairId] = (Math.random() * 0.002 - 0.001);
        lastSyntheticUpdate[pairId] = now;
    }
    const currentMidPriceOffset = syntheticPriceOffsets[pairId] || 0;
    const fluctuatingMidPrice = midPrice * (1 + currentMidPriceOffset);

    const bids: [string, string][] = [];
    const asks: [string, string][] = [];
    for (let i = 1; i <= 10; i++) {
        const priceBid = fluctuatingMidPrice * (1 - i * 0.002 - (Math.random() * 0.0001));
        const quantityBid = (Math.random() * 15 + 5) * (1 + (Math.random() * 0.05 - 0.025));
        bids.push([priceBid.toFixed(4), quantityBid.toFixed(2)]);

        const priceAsk = fluctuatingMidPrice * (1 + i * 0.002 + (Math.random() * 0.0001));
        const quantityAsk = (Math.random() * 15 + 5) * (1 + (Math.random() * 0.05 - 0.025));
        asks.push([priceAsk.toFixed(4), quantityAsk.toFixed(2)]);
    }
    return { bids, asks };
}

export async function getOrderBook(price: number, pairId: string): Promise<OrderBook> {
    let realOrders: Order[] = [];
    try {
        realOrders = await getOrdersByPairId(pairId);
    } catch (dbError) {
        console.error(`Database error fetching orders for ${pairId}:`, dbError);
    }

    const aggregateAndSort = (orders: [string, string][], reverse = false): [string, string][] => {
        const book = new Map<string, number>();
        orders.forEach(([price, size]) => {
            book.set(price, (book.get(price) || 0) + parseFloat(size));
        });
        const sorted = Array.from(book.entries()).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
        if (reverse) sorted.reverse();
        return sorted.map(([price, size]) => [price, String(size)]);
    };

    let bids: [string, string][];
    let asks: [string, string][];

    if (realOrders.length > 0) {
        const realBids = realOrders.filter(o => o.side === 'buy' && o.price).map(o => [o.price, o.quantity] as [string, string]);
        const realAsks = realOrders.filter(o => o.side === 'sell' && o.price).map(o => [o.price, o.quantity] as [string, string]);
        bids = aggregateAndSort(realBids, true);
        asks = aggregateAndSort(realAsks);
    } else {
        const syntheticOrderBook = generateSyntheticDepth(price, pairId);
        bids = syntheticOrderBook.bids;
        asks = syntheticOrderBook.asks;
    }

    return { bids, asks };
}
