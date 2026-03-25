import { EventEmitter } from 'events';
import { parseUnits } from 'viem';

// Updated imports to use the new `packages/markets` index file
import { getTradingPairs, TradingPair, getMarket, MarketState } from '@forge/markets';

const LP_ADDRESS = '0xDeAdfa11dedBeEf0B0Be00000000000000000000';

export class LiquidityEngine extends EventEmitter {
    private tradingPairs: TradingPair[] = [];
    private marketData: { [key: string]: MarketState } = {};
    private lpAddress: string;

    constructor() {
        super();
        this.lpAddress = LP_ADDRESS;
        this.initialize();
        console.log(`Liquidity Engine initialized with LP: ${this.lpAddress}`);
    }

    private async initialize() {
        try {
            // Load trading pairs and their market data from our new package
            this.tradingPairs = getTradingPairs(); // Switched to synchronous call
            for (const pair of this.tradingPairs) {
                const market = await getMarket(pair.id);
                if (market) {
                    this.marketData[pair.id] = market;
                }
            }
            console.log(`Initialized with ${this.tradingPairs.length} trading pairs.`);
        } catch (error) {
            console.error("Failed to initialize LiquidityEngine:", error);
            this.emit('agent_status', { 
                type: 'error', 
                msg: 'Failed to initialize liquidity engine.' 
            });
        }
    }

    public getPrice(pairId: string): number | null {
        const market = this.marketData[pairId];
        // The price on MarketState can be null
        return market?.price ?? null;
    }

    public async settleMatchedTrade(trade: any) {
        const { buyer, seller, quantity, price, pair } = trade;

        const amountBase = parseUnits(quantity.toString(), pair.base.decimals);
        const priceBigInt = parseUnits(price.toString(), pair.quote.decimals);
        const amountQuote = (amountBase * priceBigInt) / (10n ** BigInt(pair.base.decimals));

        this.emit('agent_status', { 
            orderId: buyer.id, 
            msg: `[Executor] Calling vault to settle internal match for ${quantity} ${pair.base.symbol}.`,
            type: 'info' 
        });

        await this.settleOnChain({
            userA: seller.userAddress,
            userB: buyer.userAddress,
            tokenA: pair.base.address,
            tokenB: pair.quote.address,
            amountA: amountBase,
            amountB: amountQuote
        });
    }

    public async executeWithLP(order: any) {
        const price = this.getPrice(order.tradingPairId);
        if (price === null) {
            console.error(`No price for pair ${order.tradingPairId}, cannot execute with LP.`);
            this.emit('agent_status', { 
                orderId: order.id, 
                msg: `[Executor] Could not get a price for ${order.pair.symbol}.`,
                type: 'error' 
            });
            return;
        }

        const pair = this.tradingPairs.find(p => p.id === order.tradingPairId);
        if (!pair) throw new Error(`Trading pair not found for id: ${order.tradingPairId}`);

        const amountBase = parseUnits(order.quantity.toString(), pair.base.decimals);
        const priceBigInt = parseUnits(price.toString(), pair.quote.decimals);
        const amountQuote = (amountBase * priceBigInt) / (10n ** BigInt(pair.base.decimals));

        this.emit('agent_status', { 
            orderId: order.id,
            msg: `[Executor] Calling DEX Aggregator to fill ${order.quantity} ${pair.base.symbol}.`,
            type: 'info' 
        });

        if (order.side === "buy") {
            await this.settleOnChain({
                userA: this.lpAddress,
                userB: order.userAddress,
                tokenA: pair.base.address,
                tokenB: pair.quote.address,
                amountA: amountBase,
                amountB: amountQuote
            });
        } else {
            await this.settleOnChain({
                userA: order.userAddress,
                userB: this.lpAddress,
                tokenA: pair.base.address,
                tokenB: pair.quote.address,
                amountA: amountBase,
                amountB: amountQuote
            });
        }
    }

    private async settleOnChain(params: any) {
        const { userA, userB, tokenA, tokenB, amountA, amountB } = params;
        
        console.log('--- Settlement Event ---');
        console.log(`  User ${userA} gives ${amountA.toString()} of ${tokenA}`);
        console.log(`  User ${userB} gets ${amountA.toString()} of ${tokenA}`);
        console.log('------------------------');

        // This is where we would submit the transaction to the blockchain.
        // For now, we just log and emit the event.

        this.emit('settlement_status', {
            userA: userA,
            userB: userB,
            message: `Settlement complete between ${userA} and ${userB}`,
            type: 'success'
        });
    }
}
