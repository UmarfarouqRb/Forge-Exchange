
import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { relayerConfig } from '@forge/common';
import { getOrders, getChainId } from '@forge/db';
import IntentSpotRouter from '../../../../deployment/abi/IntentSpotRouter.json' assert { type: "json" };
import { executeSavedOrder } from '../spot';

const MIN_PROFIT_BPS = 10; // 0.1%

async function getMarketPrice(tokenIn: string, tokenOut: string, chainId: number): Promise<number> {
    const network = relayerConfig.getNetworkByChainId(chainId);
    if (!network) {
        throw new Error(`Unsupported chainId: ${chainId}`);
    }

    const publicClient = createPublicClient({
        chain: base,
        transport: http(network.providerUrl),
    });

    const intentSpotRouterAddress = network.intentSpotRouterAddress as `0x${string}`;

    try {
        const amountIn = parseUnits('1', 18);
        const amountOut = await publicClient.readContract({
            address: intentSpotRouterAddress,
            abi: IntentSpotRouter.abi,
            functionName: 'swap',
            args: [tokenIn, tokenOut, amountIn, [], '0x'],
        });

        return parseFloat(formatUnits(amountOut as bigint, 18));
    } catch (error) {
        console.error(`Error fetching market price for ${tokenIn}/${tokenOut}:`, error);
        return 0;
    }
}

export class MatchingEngine {
    private interval: NodeJS.Timeout | null = null;

    start() {
        console.log('Starting matching engine...');
        this.interval = setInterval(() => this.matchOrders('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'), 5000);
    }

    stop() {
        if (this.interval) {
            console.log('Stopping matching engine...');
            clearInterval(this.interval);
        }
    }

    private async matchOrders(address: string) {
        console.log('Checking for matching orders...');
        const orders = await getOrders(address);
        const chainId = await getChainId();

        const bids = orders.filter(o => o.side === 'buy');
        const asks = orders.filter(o => o.side === 'sell');

        for (const bid of bids) {
            if (!bid.pair) {
                continue;
            }
            const [tokenIn, tokenOut] = bid.pair.split('/');
            const marketPrice = await getMarketPrice(tokenIn, tokenOut, chainId);
            if (marketPrice === 0) continue;

            const orderPrice = Number(bid.price);
            const amountIn = Number(bid.quantity);
            const minAmountOut = orderPrice * amountIn;

            if (marketPrice <= orderPrice) {
                const expectedOutput = amountIn * marketPrice;
                const profit = expectedOutput - minAmountOut;
                const profitBps = (profit / minAmountOut) * 10000;

                if (profitBps >= MIN_PROFIT_BPS) {
                    console.log(`Found a profitable bid to fill:`, bid);
                    await executeSavedOrder(bid);
                }
            }
        }

        for (const ask of asks) {
            if (!ask.pair) {
                continue;
            }
            const [tokenIn, tokenOut] = ask.pair.split('/');
            const marketPrice = await getMarketPrice(tokenIn, tokenOut, chainId);
            if (marketPrice === 0) continue;

            const orderPrice = Number(ask.price);
            const amountIn = Number(ask.quantity);
            const minAmountOut = orderPrice * amountIn;

            if (marketPrice >= orderPrice) {
                 const expectedOutput = amountIn * marketPrice;
                 const profit = expectedOutput - minAmountOut;
                 const profitBps = (profit / minAmountOut) * 10000;
 
                 if (profitBps >= MIN_PROFIT_BPS) {
                    console.log(`Found a profitable ask to fill:`, ask);
                    await executeSavedOrder(ask);
                 }
            }
        }
    }
}
