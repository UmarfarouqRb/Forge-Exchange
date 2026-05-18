import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LiquidityEngine } from '../liquidity/engine';
import { EventEmitter } from 'events';
import { getAddress, formatUnits, parseUnits } from 'viem';

const LP_ADDRESS = process.env.LP_ADDRESS!;
if (!LP_ADDRESS) {
    throw new Error("CRITICAL: LP_ADDRESS environment variable is not set.");
}


type Order = any;

export class MatchingEngine extends EventEmitter {
    private agentName: string;
    private liquidityEngine: LiquidityEngine;
    private supabase: SupabaseClient;
    private books: Map<string, { bids: Order[], asks: Order[] }> = new Map();
    private matchQueue: Promise<void> = Promise.resolve();

    constructor(liquidityEngine: LiquidityEngine, agentName: string = 'solver01') {
        super();
        this.liquidityEngine = liquidityEngine;
        this.agentName = agentName;
        this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        this.liquidityEngine.on('agent_status', (data) => this.emit('agent_status', data));
        this.hydrateFromDB().catch(err => console.error("Failed to hydrate order book from DB:", err));
    }

    private formatOrder(order: any): Order {
        let sourceIntent: any;

        if (order.intent && order.intent.user) {
            sourceIntent = order.intent; // Order from API
        } else if (order.user_address) {
            sourceIntent = { // Reconstruct from DB fields
                user: order.user_address,
                tokenIn: order.token_in,
                tokenOut: order.token_out,
                amountIn: order.amount_in,
                minAmountOut: order.min_amount_out,
                deadline: order.deadline,
                nonce: order.nonce,
                adapter: order.adapter,
                relayerFee: order.relayer_fee,
            };
        } else {
            if (order.intent && typeof order.intent.amountIn === 'bigint') {
                return order; // Assume already formatted
            }
            throw new Error(`[formatOrder] Invalid order structure: ${JSON.stringify(order)}`);
        }

        const formattedOrder = { ...order };

        formattedOrder.intent = {
            user: getAddress(sourceIntent.user),
            tokenIn: getAddress(sourceIntent.tokenIn),
            tokenOut: getAddress(sourceIntent.tokenOut),
            amountIn: BigInt(sourceIntent.amountIn),
            minAmountOut: BigInt(sourceIntent.minAmountOut),
            deadline: BigInt(sourceIntent.deadline),
            nonce: BigInt(sourceIntent.nonce),
            adapter: getAddress(sourceIntent.adapter),
            relayerFee: BigInt(sourceIntent.relayerFee),
        };
        
        if (!order.intent) { // If it was a DB order
            formattedOrder.intent_id = order.intent_id || order.id;
        }

        return formattedOrder;
    }

    async hydrateFromDB() {
        console.log("Hydrating order book from database...");
        const { data, error } = await this.supabase
            .from('orders')
            .select('*')
            .in('status', ['pending', 'processing']);

        if (error) {
            console.error("Error hydrating from DB:", error);
            return;
        }

        data?.forEach(order => {
            const formatted = this.formatOrder(order);
            this.addToOrderBook(formatted, true);
        });
        console.log(`Hydrated ${data?.length || 0} orders.`);
    }

    start() {
        console.log('Matching Engine is running in event-driven mode.');
    }

    stop() {
        console.log('Matching Engine is stopping.');
    }

    private addToOrderBook(order: Order, silent: boolean = false) {
        const { trading_pair_id, id, order_type, price } = order;
        if (!trading_pair_id) {
            console.warn(`[addToOrderBook] Order ${id} is missing trading_pair_id`, order);
            return;
        }

        // Sanitize limit orders before adding to the book.
        if (order_type === 'limit') {
            const numericPrice = Number(price);
            if (!numericPrice || numericPrice <= 0) {
                console.error(`[Sanitization] Refusing to add invalid limit order ${id} to book. Price: ${price}`);
                // Don't emit agent status if silent (e.g. from hydration)
                if (!silent) {
                    this.emit('agent_status', {
                        orderId: order.intent_id || id,
                        userAddress: order.intent.user,
                        msg: `Your limit order has an invalid price and will not be placed.`,
                        type: 'error',
                        side: order.side
                    });
                }
                return;
            }
        }

        if (!this.books.has(trading_pair_id)) {
            this.books.set(trading_pair_id, { bids: [], asks: [] });
        }

        const book = this.books.get(trading_pair_id)!;
        const orderList = order.side === 'buy' ? book.bids : book.asks;

        // Avoid duplicates
        if (orderList.some(o => o.id === id)) return;

        orderList.push(order);
        orderList.sort((a, b) =>
            order.side === 'buy' ? Number(b.price) - Number(a.price) : Number(a.price) - Number(b.price)
        );

        if (!silent) {
            this.emitFormattedBook(trading_pair_id, book);
        }
    }
    
    public async processOrder(rawOrder: any) {
        if (!rawOrder.intent || !rawOrder.intent_id || !rawOrder.intent.user) {
            console.error('[MatchingEngine] Received malformed order payload:', rawOrder);
            return;
        }
        
        const order = this.formatOrder(rawOrder);

        this.emit('agent_status', { 
            orderId: order.intent_id, 
            userAddress: order.intent.user, 
            msg: `Your order has been received and is being processed.`,
            type: 'info',
            side: order.side
        });

        const isLimit = order.order_type === "limit";
        const isMarket = order.order_type === "market";

        try {
            if (isLimit) {
                const numericPrice = Number(order.price);
                if (!numericPrice || numericPrice <= 0) {
                    throw new Error(`Invalid price for limit order: ${order.price}`);
                }
                this.addToOrderBook(order);
                this.enqueueMatch();

            } else if (isMarket) {
                const executionPrice = await this.liquidityEngine.getPrice(order.trading_pair_id);

                if (!executionPrice || executionPrice <= 0) {
                    throw new Error(`No price available for this trading pair at the moment.`);
                }

                order.price = executionPrice; 

                await this.fillMarketOrder(order);

            } else {
                throw new Error(`Invalid order type: ${order.order_type}`);
            }
        } catch (error) {
            const errorMessage = (error as Error).message;
            console.error(`[ProcessOrder] Failed order ${order.intent_id}:`, errorMessage);
            this.emit('agent_status', { 
                orderId: order.intent_id, 
                userAddress: order.intent.user,
                msg: `Your order could not be processed: ${errorMessage}`,
                type: 'error',
                side: order.side
            });
            await this.updateOrderStatusInDB({ ...order, status: 'failed', last_error: errorMessage });
        }
    }
    
    private enqueueMatch() {
        this.matchQueue = this.matchQueue
            .then(() => this.matchOrders())
            .catch(err => console.error("Error in matching queue:", err));
        return this.matchQueue;
    }

    private async getLPOrder(pairId: string, side: 'buy' | 'sell') {
        const price = await this.liquidityEngine.getPrice(pairId);
        if (!price || price <= 0) {
            console.error("LP price unavailable for pair:", pairId);
            return null;
        }
    
        const spread = 0.002;
    
        const lpPrice = side === 'buy' ? price * (1 + spread) : price * (1 - spread);
    
        return {
            id: 'LP_ORDER',
            user_address: LP_ADDRESS,
            side,
            price: lpPrice,
            quantity: Infinity, 
            isLP: true
        };
    }

    public async getQuote(pairId: string, side: 'buy' | 'sell', quantity: number) {
        const book = this.books.get(pairId) || { bids: [], asks: [] };
        const counterOrders = side === 'buy' ? book.asks : book.bids;
        let remainingQuantity = quantity;
        let totalCost = 0;
        let internalFill = 0;
        let lpFill = 0;

        // 1. Simulate consuming internal liquidity
        for (const order of counterOrders) {
            if (remainingQuantity <= 0) break;
            const fillQty = Math.min(remainingQuantity, Number(order.quantity));
            totalCost += fillQty * Number(order.price);
            internalFill += fillQty;
            remainingQuantity -= fillQty;
        }

        // 2. Simulate LP fallback for remaining quantity
        if (remainingQuantity > 0) {
            const lpOrder = await this.getLPOrder(pairId, side === 'buy' ? 'sell' : 'buy');
            if (lpOrder && lpOrder.price) {
                // Add 0.1% extra profit margin on top of LP price
                const profitMargin = 0.001;
                const quotePrice = side === 'buy' ? lpOrder.price * (1 + profitMargin) : lpOrder.price * (1 - profitMargin);
                
                totalCost += remainingQuantity * quotePrice;
                lpFill += remainingQuantity;
                remainingQuantity = 0;
            }
        }

        if (remainingQuantity > 0) {
            return { error: "Insufficient liquidity for the requested quantity." };
        }

        const avgPrice = totalCost / quantity;
        return {
            pairId,
            side,
            quantity,
            price: avgPrice.toFixed(6),
            breakdown: {
                internal: internalFill,
                lp: lpFill
            }
        };
    }

    private async fillMarketOrder(marketOrder: Order) {
        const pairId = marketOrder.trading_pair_id;
        let remainingQuantity = Number(marketOrder.quantity);

        const book = this.books.get(pairId) || { bids: [], asks: [] };
        const counterOrders = marketOrder.side === 'buy' ? book.asks : book.bids;

        if (counterOrders.length === 0) {
            console.log("No internal liquidity, going to external/LP immediately");
        }

        for (const counterOrder of counterOrders) {
            if (remainingQuantity <= 0) break;

            const tradePrice = Number(counterOrder.price);
            if (!tradePrice || isNaN(tradePrice)) {
                console.warn("Skipping invalid counter order price:", counterOrder);
                continue;
            }
            
            const fillQuantity = Math.min(remainingQuantity, Number(counterOrder.quantity));
            
            await this.executeInternalMatch(
                marketOrder.side === 'buy' ? marketOrder : { ...counterOrder },
                marketOrder.side === 'buy' ? { ...counterOrder } : marketOrder,
                fillQuantity,
                tradePrice
            );

            remainingQuantity -= fillQuantity;
            marketOrder.quantity = remainingQuantity.toString();
        }

        if (remainingQuantity > 0) {
            const simulation = await this.liquidityEngine.simulateExternalSwap(marketOrder.intent, marketOrder.signature);

            if (simulation.success) {
                const internalPrice = await this.liquidityEngine.getPrice(marketOrder.trading_pair_id);
                const pair = this.liquidityEngine.getTradingPairs().find(p => p.id === marketOrder.trading_pair_id);

                if (internalPrice && pair) {
                    const amountIn = BigInt(marketOrder.intent.amountIn);
                    const tokenInAddress = getAddress(marketOrder.intent.tokenIn);
                    const inTokenInfo = getAddress(pair.base.address) === tokenInAddress ? pair.base : pair.quote;
                    const inDecimals = inTokenInfo.decimals;
                    const amountInFormatted = Number(formatUnits(amountIn, inDecimals));

                    const tokenOutAddress = getAddress(marketOrder.intent.tokenOut);
                    const outTokenInfo = getAddress(pair.base.address) === tokenOutAddress ? pair.base : pair.quote;
                    const outDecimals = outTokenInfo.decimals;

                    let internalAmountOut: bigint;
                    if (getAddress(pair.base.address) === tokenInAddress) { // tokenIn is base, so selling base for quote
                        const internalAmountOutNumber = amountInFormatted * internalPrice * (1 - 0.002);
                        internalAmountOut = parseUnits(internalAmountOutNumber.toString(), outDecimals);
                    } else { // tokenIn is quote, so buying base with quote
                        const internalAmountOutNumber = amountInFormatted / internalPrice * (1 - 0.002);
                        internalAmountOut = parseUnits(internalAmountOutNumber.toString(), outDecimals);
                    }

                    const profit = BigInt(simulation.amountOut) - internalAmountOut;
                    const profitFormatted = formatUnits(profit, outDecimals);

                    this.emit('agent_status', { 
                        orderId: marketOrder.intent_id, 
                        userAddress: marketOrder.intent.user, 
                        msg: `We found better price for you via our liquidity network!`,
                        type: 'info',
                        side: marketOrder.side
                    });

                    await this.executeLPMatch(marketOrder, await this.getLPOrder(pairId, marketOrder.side === 'buy' ? 'sell' : 'buy'), remainingQuantity);
                    remainingQuantity = 0;
                } else {
                    this.emit('agent_status', { orderId: marketOrder.intent_id, userAddress: marketOrder.intent.user, msg: `Could not get internal price. Proceeding with external swap.`, type: 'warning', side: marketOrder.side });
                    try {
                        await this.liquidityEngine.executeWithExternalDex(marketOrder.intent, marketOrder.signature, marketOrder.intent_id, marketOrder.side);
                        remainingQuantity = 0; 
                    } catch (err) {
                         console.warn(`DEX execution failed after successful simulation: ${(err as Error).message}. Falling back to LP.`);
                         this.emit('agent_status', { orderId: marketOrder.intent_id, userAddress: marketOrder.intent.user, msg: `DEX execution failed. Falling back to LP.`, type: 'warning', side: marketOrder.side });
                    }
                }

            } else {
                const failMsg = (simulation as any).error || 'External DEX simulation failed or insufficient liquidity';
                this.emit('agent_status', { 
                    orderId: marketOrder.intent_id, 
                    userAddress: marketOrder.intent.user, 
                    msg: `External simulation failed. Falling back to LP.`,
                    type: 'info',
                    side: marketOrder.side
                });
            }
        }

        if (remainingQuantity > 0) {
            const oppositeSide = marketOrder.side === 'buy' ? 'sell' : 'buy';

            console.log("Looking for pair:", pairId);
            console.log("Available pairs:", this.liquidityEngine.getTradingPairs().map(p => p.id));

            const lpOrder = await this.getLPOrder(pairId, oppositeSide);

            if (!lpOrder || !lpOrder.price) {
                throw new Error("LP fallback failed: no valid price");
            }

            if (lpOrder) {
                 this.emit('agent_status', { orderId: marketOrder.intent_id, userAddress: marketOrder.intent.user, msg: `Finalizing your trade using Forge internal liquidity.`, type: 'info', side: marketOrder.side });
                await this.executeLPMatch(marketOrder, lpOrder, remainingQuantity);
                remainingQuantity = 0;
            } else {
                this.emit('agent_status', { orderId: marketOrder.intent_id, userAddress: marketOrder.intent.user, msg: `CRITICAL: No LP fallback available for pair ${pairId}. Order may be partially filled.`, type: 'error', side: marketOrder.side });
            }
        }
    }

    private async matchOrders() {
        for (const [pairId, book] of this.books.entries()) {
            while (book.bids.length > 0 && book.asks.length > 0) {
                const bestBid = book.bids[0];
                const bestAsk = book.asks[0];

                if (Number(bestBid.price) >= Number(bestAsk.price)) {
                    const fillQuantity = Math.min(Number(bestBid.quantity), Number(bestAsk.quantity));
                    await this.executeInternalMatch({ ...bestBid }, { ...bestAsk }, fillQuantity, Number(bestAsk.price));
                } else {
                    break;
                }
            }
        }
    }

    private async executeLPMatch(taker: Order, lpOrder: Order, quantity: number) {
        const orderForLp = { ...taker, quantity };
        const settlement = await this.liquidityEngine.executeWithLP(orderForLp);
        this.updateOrderStatusInDB({ ...taker, quantity: Number(taker.quantity) - quantity });
    
        if (!settlement) return;

        const { receipt, amountOut } = settlement;
        const pair = this.liquidityEngine.getTradingPairs().find(p => p.id === taker.trading_pair_id);
        let amountUsd = 0;

        if (pair) {
            const tokenInAddress = getAddress(taker.intent.tokenIn);
            const inTokenIsBase = getAddress(pair.base.address) === tokenInAddress;
            const inTokenIsQuote = getAddress(pair.quote.address) === tokenInAddress;
            const inDecimals = inTokenIsBase ? pair.base.decimals : pair.quote.decimals;
            const amountInFormatted = Number(formatUnits(taker.intent.amountIn, inDecimals));

            if (pair.quote.symbol.includes('USD')) {
                if (inTokenIsQuote) {
                    amountUsd = amountInFormatted;
                } else { // inToken is Base
                    const pairPrice = await this.liquidityEngine.getPrice(taker.trading_pair_id);
                    if (pairPrice) {
                        amountUsd = amountInFormatted * pairPrice;
                    }
                }
            }
        } else {
            console.error(`[executeLPMatch] Could not find pair for id: ${taker.trading_pair_id}`);
        }

        await this.supabase.from('trade_executions').insert({
            tx_hash: receipt.transactionHash,
            user_address: taker.intent.user,
            token_in: taker.intent.tokenIn,
            token_out: taker.intent.tokenOut,
            amount_in: taker.intent.amountIn.toString(),
            amount_out: amountOut.toString(),
            amount_usd: amountUsd,
            protocol_fee: '0',
            relayer_fee: taker.intent.relayerFee.toString(),
            created_at: new Date()
        });
    }

    private async fillOrderViaLP(order: Order) {
        try {
            const pairId = order.trading_pair_id;
            const oppositeSide = order.side === 'buy' ? 'sell' : 'buy';
            const lpOrder = await this.getLPOrder(pairId, oppositeSide);
    
            if (!lpOrder || !lpOrder.price) {
                throw new Error(`LP fallback failed for ${order.id}: no valid LP price for pair ${pairId}.`);
            }
    
            const isPriceFavorable = order.side === 'buy'
                ? lpOrder.price <= Number(order.price)
                : lpOrder.price >= Number(order.price);
    
            if (isPriceFavorable) {
                this.emit('agent_status', { orderId: order.intent_id, userAddress: order.intent.user, msg: `Finalizing your trade using Forge internal liquidity.`, type: 'info', side: order.side });
                await this.executeLPMatch(order, lpOrder, Number(order.quantity));
                this.updateOrderStatusInDB({ ...order, quantity: 0 });
            } else {
                 this.emit('agent_status', { orderId: order.intent_id, userAddress: order.intent.user, msg: `Could not fill order via LP: unfavorable price. Order remains active.`, type: 'warning', side: order.side });
            }
        } catch(err) {
            console.error(`[fillOrderViaLP] CRITICAL error for order ${order.id}:`, err);
            this.emit('agent_status', { orderId: order.intent_id, userAddress: order.intent.user, msg: `An unexpected error occurred while trying to fill your order with our liquidity provider.`, type: 'error', side: order.side });
        }
    }
    
    private async executeInternalMatch(buyer: Order, seller: Order, quantity: number, price: number) {
        if (!price || isNaN(price) || price <= 0) {
            console.error("Invalid trade price detected:", price);
            return;
        }
    
        if (!buyer.intent || !seller.intent) {
            console.error('CRITICAL: Invalid match payload due to missing intent structure.', {
                buyerId: buyer.id,
                sellerId: seller.id,
                hasBuyerIntent: !!buyer.intent,
                hasSellerIntent: !!seller.intent
            });
            return;
        }
    
        const msg = `We are matching your order with another user on Forge.`;
    
        this.emit('agent_status', { 
            orderId: buyer.intent_id, 
            userAddress: buyer.intent.user,
            msg,
            type: 'info', 
            side: buyer.side 
        });
    
        this.emit('agent_status', { 
            orderId: seller.intent_id, 
            userAddress: seller.intent.user,
            msg,
            type: 'info', 
            side: seller.side 
        });
        
        try {
            const settlement = await this.liquidityEngine.settleMatchedTrade({ buyer, seller, quantity, price, intentId: buyer.intent_id });
            if (!settlement) {
                throw new Error("Internal settlement failed pre-check in liquidity engine.");
            }
            
            const { receipt, amountOut } = settlement;
            const pair = this.liquidityEngine.getTradingPairs().find(p => p.id === buyer.trading_pair_id);
            let amountUsd = 0;

            if (pair) {
                const tokenInAddress = getAddress(buyer.intent.tokenIn);
                const inTokenIsBase = getAddress(pair.base.address) === tokenInAddress;
                const inTokenIsQuote = getAddress(pair.quote.address) === tokenInAddress;
                const inDecimals = inTokenIsBase ? pair.base.decimals : pair.quote.decimals;
                const amountInFormatted = Number(formatUnits(buyer.intent.amountIn, inDecimals));

                if (pair.quote.symbol.includes('USD')) {
                    if (inTokenIsQuote) {
                        amountUsd = amountInFormatted;
                    } else { // inToken is Base
                        amountUsd = amountInFormatted * price;
                    }
                }
            } else {
                console.error(`[executeInternalMatch] Could not find pair for id: ${buyer.trading_pair_id}`);
            }
    
            await this.supabase.from('trade_executions').insert({
                tx_hash: receipt.transactionHash,
                user_address: buyer.intent.user,
                token_in: buyer.intent.tokenIn,
                token_out: buyer.intent.tokenOut,
                amount_in: buyer.intent.amountIn.toString(),
                amount_out: amountOut.toString(),
                amount_usd: amountUsd,
                protocol_fee: '0',
                relayer_fee: buyer.intent.relayerFee.toString(),
                created_at: new Date()
            });
    
            const updatedBuyer = { ...buyer, quantity: Number(buyer.quantity) - quantity };
            const updatedSeller = { ...seller, quantity: Number(seller.quantity) - quantity };
        
            const pairId = buyer.trading_pair_id || seller.trading_pair_id;
            const book = this.books.get(pairId)!;
        
            book.bids = book.bids.map(o => o.id === buyer.id ? updatedBuyer : o).filter(o => o.quantity > 0);
            book.asks = book.asks.map(o => o.id === seller.id ? updatedSeller : o).filter(o => o.quantity > 0);
                
            this.updateOrderStatusInDB(updatedBuyer);
            this.updateOrderStatusInDB(updatedSeller);
                
            this.emitFormattedBook(pairId, book);

        } catch (error) {
            console.warn(`Internal match failed for quantity ${quantity}. Error: ${(error as Error).message}. Fallback to LP.`);
            this.emit('agent_status', {
                orderId: buyer.intent_id,
                userAddress: buyer.intent.user,
                msg: `Partial fill or liquidity issue. Rerouting to our LP network to complete your trade.`,
                type: 'info',
                side: buyer.side
            });
            this.emit('agent_status', {
                orderId: seller.intent_id,
                userAddress: seller.intent.user,
                msg: `Partial fill or liquidity issue. Rerouting to our LP network to complete your trade.`,
                type: 'info',
                side: seller.side
            });
    
            if (buyer.quantity > 0) {
                console.log(`Attempting to fill remaining BUY order ${buyer.id} via LP.`);
                await this.fillOrderViaLP(buyer);
            }
    
            if (seller.quantity > 0) {
                console.log(`Attempting to fill remaining SELL order ${seller.id} via LP.`);
                await this.fillOrderViaLP(seller);
            }
    
            const pairId = buyer.trading_pair_id || seller.trading_pair_id;
            const book = this.books.get(pairId)!;
            if(book) {
                book.bids = book.bids.filter(o => o.id !== buyer.id);
                book.asks = book.asks.filter(o => o.id !== seller.id);
                this.emitFormattedBook(pairId, book);
            }
        }
    }

    private emitFormattedBook(pairId: string, book: {bids: Order[], asks: Order[]}) {
        const formattedBook = this.formatOrderBook(book);
        this.emit('orderbook_update', { pairId, ...formattedBook });
    }

    private formatOrderBook(book: { bids: Order[], asks: Order[] }) {
        const aggregate = (orders: Order[], isBid: boolean) => {
            const map = new Map<number, number>();
            orders.forEach(o => {
                const price = Number(o.price);
                const qty = Number(o.quantity);
                map.set(price, (map.get(price) || 0) + qty);
            });
    
            const sorted = Array.from(map.entries()).sort((a, b) => isBid ? b[0] - a[0] : a[0] - b[0]);
            return sorted.map(([price, qty]) => [price.toFixed(4), qty.toString()]);
        };
    
        return { bids: aggregate(book.bids, true), asks: aggregate(book.asks, false) };
    }

    private async updateOrderStatusInDB(order: Order) {
        const orderId = order.id || order.intent_id;
        if (!orderId) {
            console.error("Missing order ID for DB update:", order);
            return;
        }
        if (order.id === 'LP_ORDER') return;
    
        const isFilled = order.quantity !== undefined && Number(order.quantity) <= 0;
        const finalStatus = order.status || (isFilled ? 'fulfilled' : 'processing');
        
        const updatePayload: { quantity?: string; status: string; last_error?: string | null } = {
            status: finalStatus,
        };

        if (order.quantity !== undefined) {
            updatePayload.quantity = order.quantity.toString();
        }

        updatePayload.last_error = order.last_error || null;

        const { error } = await this.supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId);

        if (error) {
            console.error(`[DB_SYNC_ERROR] Failed to update order ${orderId} with payload ${JSON.stringify(updatePayload)}:`, error);
        }
    }
}
