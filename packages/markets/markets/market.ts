
import {
    http,
    createPublicClient,
    parseUnits,
    formatUnits,
    isAddress
} from 'viem';
import { base } from 'viem/chains';
import { PANCAKE_QUOTER_V2_ADDRESS, PANCAKE_QUOTER_V2_ABI } from './QuoterV2';
import type { Token } from '../tokens/mainnet-tokens';
import { MAINNET_TOKENS } from '../tokens/mainnet-tokens';
import { getTradingPairs } from '../tradingPairs/trading-pairs';
import { get24hMarketData } from './market-data';
import { getBook as getLiveOrderbook } from './order-book-store'; 

// --- TYPE DEFINITIONS ---

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

export type MarketState = {
    id: string;
    symbol: string;
    price: number | null;
    lastPrice: string | null;
    priceChangePercent: number;
    high24h: string | null;
    low24h: string | null;
    volume24h: string | null;
    currentPrice: string | null;
    bids: [string, string][];
    asks: [string, string][];
    source: 'live' | 'cached' | 'unavailable' | 'mock';
    isActive: boolean;
};

// --- UTILITY FUNCTIONS ---

function safeAddress(addr?: string | null): `0x${string}` | null {
    if (!addr) return null;
    if (!isAddress(addr)) {
        console.warn(`Invalid address provided: ${addr}`);
        return null;
    }
    return addr.toLowerCase() as `0x${string}`;
}

const getDisplayToken = (token: Token): Token => {
    return token;
};

// --- LIVE DATA FETCHING ---

const alchemyRpcUrl = process.env.ALCHEMY_RPC_URL;
const publicRpcUrl = 'https://mainnet.base.org';

const primaryTransport = alchemyRpcUrl ? http(alchemyRpcUrl) : http(publicRpcUrl);
const primaryClient = createPublicClient({ chain: base, transport: primaryTransport });

const fallbackClient = alchemyRpcUrl ? createPublicClient({ chain: base, transport: http(publicRpcUrl) }) : null;

export async function getAMMPrice(tokenIn: { address: string; decimals: number }, tokenOut: { address: string; decimals: number }): Promise<number | null> {
    const safeTokenInAddress = safeAddress(tokenIn.address);
    const safeTokenOutAddress = safeAddress(tokenOut.address);

    if (!safeTokenInAddress || !safeTokenOutAddress) {
        console.warn(`AMM call skipped due to invalid token address.`);
        return null;
    }

    const feeTiers = [100, 500, 2500, 10000];

    for (const fee of feeTiers) {
        const params = {
            tokenIn: safeTokenInAddress,
            tokenOut: safeTokenOutAddress,
            amountIn: parseUnits('1', tokenIn.decimals),
            fee: fee,
            sqrtPriceLimitX96: 0,
        } as const;

        const contractCall = {
            address: PANCAKE_QUOTER_V2_ADDRESS,
            abi: PANCAKE_QUOTER_V2_ABI,
            functionName: 'quoteExactInputSingle',
            args: [params],
        } as const;

        try {
            const result = await primaryClient.readContract(contractCall);
            const amountOut = result[0];
            if (amountOut) {
                return parseFloat(formatUnits(amountOut as bigint, tokenOut.decimals));
            }
        } catch (primaryError) {
            if (fallbackClient) {
                try {
                    const result = await fallbackClient.readContract(contractCall);
                    const amountOut = result[0];
                    if (amountOut) {
                        console.log('Used fallback RPC to get price.');
                        return parseFloat(formatUnits(amountOut as bigint, tokenOut.decimals));
                    }
                } catch (fallbackError) {
                    // Both failed, continue to next fee tier
                }
            }
        }
    }

    console.error(`Failed to fetch AMM price for pair after trying all fee tiers.`);
    return null;
}

async function getOrderBook(baseToken: Token, quoteToken: Token, pairId: string): Promise<OrderBook & { lastTradePrice: number | null }> {
    const liveBook = getLiveOrderbook(pairId);
    
    if (liveBook) {
        const midPrice = await getAMMPrice(baseToken, quoteToken);
        return {
            ...liveBook,
            lastTradePrice: midPrice
        };
    }
    
    // Fallback to DEX aggregated if no live book exists
    const midPrice: number | null = await getAMMPrice(baseToken, quoteToken);
    if (midPrice) {
        const dexBook = generateDexAggregatedDepth(midPrice);
        return { ...dexBook, lastTradePrice: midPrice };
    }

    return { bids: [], asks: [], lastTradePrice: null };
}

function generateDexAggregatedDepth(midPrice: number): OrderBook {
    const bids: [string, string][] = [];
    const asks: [string, string][] = [];
    for (let i = 1; i <= 10; i++) {
        const priceBid = midPrice * (1 - i * 0.002 - (Math.random() * 0.0001));
        const quantityBid = (Math.random() * 15 + 5) * (1 + (Math.random() * 0.05 - 0.025));
        bids.push([priceBid.toFixed(4), quantityBid.toFixed(2)]);

        const priceAsk = midPrice * (1 + i * 0.002 + (Math.random() * 0.0001));
        const quantityAsk = (Math.random() * 15 + 5) * (1 + (Math.random() * 0.05 - 0.025));
        asks.push([priceAsk.toFixed(4), quantityAsk.toFixed(2)]);
    }
    return { bids, asks };
}


export function getMarkPrice(book: OrderBook & { lastTradePrice: number | null }): number | null {
    const bestBid = book.bids[0]?.[0];
    const bestAsk = book.asks[0]?.[0];
    if (bestBid && bestAsk) return (parseFloat(bestBid) + parseFloat(bestAsk)) / 2;
    return book.lastTradePrice;
}

export async function getMarket(pairId: string): Promise<MarketState | null> {
    try {
        const pairInfo = getTradingPairs().find(p => p.id === pairId);
        if (!pairInfo) {
            return null;
        }

        const baseToken = getDisplayToken(MAINNET_TOKENS[pairInfo.base.symbol]);
        const quoteToken = getDisplayToken(MAINNET_TOKENS[pairInfo.quote.symbol]);

        const [bookResult, marketData24hResult] = await Promise.allSettled([
            getOrderBook(baseToken, quoteToken, pairId ),
            get24hMarketData(baseToken, quoteToken)
        ]);

        const book = bookResult.status === 'fulfilled' ? bookResult.value : { bids: [], asks: [], lastTradePrice: null };
        const marketData24h = marketData24hResult.status === 'fulfilled' ? marketData24hResult.value : null;

        if (bookResult.status === 'rejected') {
            console.error(`Failed to get order book for ${pairInfo.id}:`, bookResult.reason);
        }

        if (marketData24hResult.status === 'rejected') {
            console.error(`Failed to get 24h market data for ${pairInfo.id}:`, marketData24hResult.reason);
        }

        const markPrice = getMarkPrice(book);
        const lastPrice = book.lastTradePrice?.toString() ?? null;

        const marketState: MarketState = {
            id: pairId,
            symbol: pairInfo.symbol,
            price: markPrice,
            lastPrice: lastPrice,
            priceChangePercent: marketData24h?.priceChangePercent ?? 0,
            high24h: marketData24h?.high24h.toString() ?? null,
            low24h: marketData24h?.low24h.toString() ?? null,
            volume24h: marketData24h?.volume24h.toString() ?? null,
            currentPrice: markPrice?.toString() ?? null,
            bids: book.bids,
            asks: book.asks,
            source: getLiveOrderbook(pairId) ? 'live' : 'mock',
            isActive: true,
        };
        
        return marketState;
    } catch (error) {
        console.error(`Critical failure in getMarket for ${pairId}:`, error);
        return null;
    }
}

export async function getMarketBySymbol(symbol: string): Promise<MarketState | null> {
    const pair = getTradingPairs().find(p => p.symbol === symbol);
    if (!pair) {
        return null;
    }
    return getMarket(pair.id);
}
