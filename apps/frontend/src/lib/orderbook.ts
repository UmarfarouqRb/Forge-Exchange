import { OrderBookData } from '@/types/orderbook';

// --- Synthetic Liquidity Generation ---
export function generateSyntheticOrderBook(midPrice: number): OrderBookData {
    const bids: [string, string][] = [];
    const asks: [string, string][] = [];
    const depthLevels = 10;
    const spreadPercentage = 0.002; // 0.2% between each level

    for (let i = 1; i <= depthLevels; i++) {
        const bidPrice = midPrice * (1 - i * spreadPercentage);
        const askPrice = midPrice * (1 + i * spreadPercentage);
        
        // Simulate some random volume for each level
        const bidSize = Math.random() * 15 + 5; // Random size between 5 and 20
        const askSize = Math.random() * 15 + 5; // Random size between 5 and 20

        bids.push([bidPrice.toFixed(4), bidSize.toFixed(2)]);
        asks.push([askPrice.toFixed(4), askSize.toFixed(2)]);
    }

    return { bids, asks };
}

// --- Order Book Aggregation ---
export function aggregateAndSortOrderBook(realBids: [string, string][], realAsks: [string, string][], syntheticBids: [string, string][], syntheticAsks: [string, string][]): OrderBookData {
    const aggregate = (real: [string, string][], synthetic: [string, string][], reverse = false) => {
        const book = new Map<string, number>();
        [...real, ...synthetic].forEach(([price, size]) => {
            const priceStr = String(price);
            const currentSize = book.get(priceStr) || 0;
            book.set(priceStr, currentSize + parseFloat(size as string));
        });

        const sorted = Array.from(book.entries()).sort((a, b) => {
            const diff = parseFloat(a[0]) - parseFloat(b[0]);
            return reverse ? -diff : diff;
        });
        
        return sorted.map(([price, size]) => [price, String(size)]) as [string, string][];
    };

    const bids = aggregate(realBids, syntheticBids, true);
    const asks = aggregate(realAsks, syntheticAsks);

    return { bids, asks };
}
