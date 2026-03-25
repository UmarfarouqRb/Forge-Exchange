
import { getTradingPairs, getMarket } from '@forge/db';
import { TradingPair, Market } from '@forge/database';
import { parseUnits } from 'viem';
import { relayer } from '../index'; // Assuming a global relayer instance for on-chain settlement

// A placeholder for our Liquidity Provider address
const LP_ADDRESS = '0xDeAdfa11dedBeEf0B0Be00000000000000000000';

export class LiquidityEngine {
    private tradingPairs: TradingPair[] = [];
    private marketData: { [key: string]: Market } = {};
    private lpAddress: string;

    constructor() {
        // In a real app, this would come from a secure config
        this.lpAddress = LP_ADDRESS;
        this.initialize();
        console.log(`Liquidity Engine initialized with LP: ${this.lpAddress}`);    
    }

    private async initialize() {
        try {
            this.tradingPairs = await getTradingPairs();
            for (const pair of this.tradingPairs) {
                const market = await getMarket(pair.id);
                if (market) {
                    this.marketData[pair.id] = market;
                }
            }
            console.log(`Initialized with ${this.tradingPairs.length} trading pairs.`);
        } catch (error) {
            console.error("Failed to initialize LiquidityEngine:", error);
        }
    }

    // -----------------------------
    // PRICE SOURCE
    // -----------------------------
    public getPrice(pairId: string): number | null {
        const market = this.marketData[pairId];
        return market ? Number(market.price) : null;
    }

    // -----------------------------
    // USER ↔ USER MATCH
    // -----------------------------
    public async settleMatchedTrade({
        buyer,
        seller,
        quantity,
        price
    }: {
        buyer: any;
        seller: any;
        quantity: number;
        price: number;
    }) {
        const pair = this.tradingPairs.find(p => p.id === buyer.tradingPairId);
        if (!pair) throw new Error(`Trading pair not found for id: ${buyer.tradingPairId}`);

        const baseToken = pair.base;
        const quoteToken = pair.quote;

        // Use BigInt for all monetary calculations to avoid float precision issues
        const amountBase = parseUnits(quantity.toString(), baseToken.decimals);
        const priceBigInt = parseUnits(price.toString(), quoteToken.decimals); // Treat price as having quote decimals
        const amountQuote = (amountBase * priceBigInt) / (10n ** BigInt(baseToken.decimals));

        console.log(`Settling matched trade: ${quantity} of ${baseToken.symbol} at ${price} ${quoteToken.symbol}`);

        // Seller gives Base, gets Quote
        // Buyer gives Quote, gets Base
        await this.settleOnChain({
            userA: seller.userAddress,
            userB: buyer.userAddress,
            tokenA: baseToken.address,
            tokenB: quoteToken.address,
            amountA: amountBase,
            amountB: amountQuote
        });
    }

    // -----------------------------
    // LP FALLBACK
    // -----------------------------
    public async executeWithLP(order: any) {
        const price = this.getPrice(order.tradingPairId);
        if (!price) {
            console.error(`No price for pair ${order.tradingPairId}, cannot execute with LP.`);
            return;
        }

        const pair = this.tradingPairs.find(p => p.id === order.tradingPairId);
        if (!pair) throw new Error(`Trading pair not found for id: ${order.tradingPairId}`);

        const baseToken = pair.base;
        const quoteToken = pair.quote;

        const amountBase = parseUnits(order.quantity, baseToken.decimals);
        const priceBigInt = parseUnits(price.toString(), quoteToken.decimals);
        const amountQuote = (amountBase * priceBigInt) / (10n ** BigInt(baseToken.decimals));
        
        console.log(`Executing order ${order.nonce} with LP at price ${price}`);

        if (order.side === "buy") {
            // User is BUYING base token, LP is SELLING base token
            await this.settleOnChain({
                userA: this.lpAddress, // Sells base
                userB: order.userAddress, // Buys base
                tokenA: baseToken.address,
                tokenB: quoteToken.address,
                amountA: amountBase,
                amountB: amountQuote
            });
        } else { // sell
            // User is SELLING base token, LP is BUYING base token
            await this.settleOnChain({
                userA: order.userAddress, // Sells base
                userB: this.lpAddress, // Buys base
                tokenA: baseToken.address,
                tokenB: quoteToken.address,
                amountA: amountBase,
                amountB: amountQuote
            });
        }
    }

    // -----------------------------
    // CORE SETTLEMENT
    // -----------------------------
    private async settleOnChain(params: {
        userA: string; // The user selling token A
        userB: string; // The user selling token B
        tokenA: string;
        tokenB: string;
        amountA: bigint;
        amountB: bigint;
    }) {
        const { userA, userB, tokenA, tokenB, amountA, amountB } = params;
        
        // This function abstracts the on-chain settlement.
        // It represents an atomic swap of tokens between two users in our vault.
        console.log('--- Settlement Event ---');
        console.log(`  User ${userA} gives ${amountA.toString()} of ${tokenA}`);
        console.log(`  User ${userA} gets ${amountB.toString()} of ${tokenB}`);
        console.log('---');
        console.log(`  User ${userB} gives ${amountB.toString()} of ${tokenB}`);
        console.log(`  User ${userB} gets ${amountA.toString()} of ${tokenA}`);
        console.log('------------------------');


        // In the future, this will call the relayer to submit two intents to the chain
        // to be settled by the IntentSpotRouter's new `settleTrade` function.
        // For now, we are just logging the intended outcome.
        // Example placeholder:
        // await relayer.submitSettlement(params);
    }
}
