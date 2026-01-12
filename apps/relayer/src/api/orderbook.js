"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderBook = void 0;
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const IntentSpotRouter_1 = require("../abis/IntentSpotRouter");
const contracts_1 = require("../config/contracts");
const db_1 = require("../db");

// --- Blockchain Client Setup ---
const transport = (0, viem_1.http)(process.env.RPC_URL);
const client = (0, viem_1.createPublicClient)({
  chain: chains_1.foundry,
  transport,
});

// --- Price Fetching ---
async function getAMMPrice(tokenIn, tokenOut) {
    try {
        const amountOut = await client.readContract({
            address: contracts_1.INTENT_SPOT_ROUTER_ADDRESS,
            abi: IntentSpotRouter_1.intentSpotRouterABI,
            functionName: 'getAmountOut',
            args: [tokenIn.address, tokenOut.address, (0, viem_1.parseUnits)('1', tokenIn.decimals)],
        });
        return parseFloat((0, viem_1.formatUnits)(amountOut, tokenOut.decimals));
    } catch (error) {
        console.error("Error fetching AMM price:", error);
        return null; // Return null if fetching fails
    }
}

// --- Synthetic Liquidity Generation ---
function generateSyntheticDepth(midPrice) {
    const bids = [];
    const asks = [];
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

// --- Order Book Logic ---
async function getOrderBook(req, res) {
    const { market } = req.query;
    if (typeof market !== 'string') {
        return res.status(400).json({ error: 'Market query parameter is required' });
    }

    const [baseCurrency, quoteCurrency] = market.split('-');
    const tokenIn = contracts_1.TOKENS[baseCurrency];
    const tokenOut = contracts_1.TOKENS[quoteCurrency];

    if (!tokenIn || !tokenOut) {
        return res.status(400).json({ error: 'Invalid market specified' });
    }

    // 1. Fetch real orders from the DB
    const realOrders = await db_1.repository.getOrdersByMarket(market);
    const realBids = realOrders.filter(o => o.side === 'buy').map(o => [o.price, o.amount]);
    const realAsks = realOrders.filter(o => o.side === 'sell').map(o => [o.price, o.amount]);

    // 2. Fetch the AMM mid-price
    const midPrice = await getAMMPrice(tokenIn, tokenOut);
    if (midPrice === null) {
        // If we can't get a price, we can't generate synthetic depth.
        // We could return an error or just the real orders.
        return res.status(503).json({ error: 'Could not fetch market price from AMM.' });
    }

    // 3. Generate synthetic liquidity
    const syntheticDepth = generateSyntheticDepth(midPrice);

    // 4. Merge real and synthetic orders (with aggregation)
    const aggregateAndSort = (real, synthetic, reverse = false) => {
        const book = new Map();
        [...real, ...synthetic].forEach(([price, size]) => {
            const priceStr = String(price);
            const currentSize = book.get(priceStr) || 0;
            book.set(priceStr, currentSize + parseFloat(size));
        });

        const sorted = Array.from(book.entries()).sort((a, b) => {
            const diff = parseFloat(a[0]) - parseFloat(b[0]);
            return reverse ? -diff : diff;
        });
        
        return sorted.map(([price, size]) => [price, String(size)]);
    };

    const bids = aggregateAndSort(realBids, syntheticDepth.bids, true);
    const asks = aggregateAndSort(realAsks, syntheticDepth.asks);

    // 5. Return the combined order book
    res.json({ bids, asks });
}
exports.getOrderBook = getOrderBook;
