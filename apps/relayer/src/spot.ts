
import { relayerConfig } from '@forge/common';
import { saveOrder, updateOrderStatus } from '@forge/db';
import { createPublicClient, createWalletClient, http, keccak256, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import IntentSpotRouter from '../../../deployment/abi/IntentSpotRouter.json' assert { type: "json" };
import { getTokenDecimals } from './utils/tokens';

const intentSpotRouterABI = IntentSpotRouter.abi;

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
        const tokenInDecimals = await getTokenDecimals(tokenIn, chainId);
        const tokenOutDecimals = await getTokenDecimals(tokenOut, chainId);

        const amountIn = parseUnits('1', tokenInDecimals);
        const amountOut = await publicClient.readContract({
            address: intentSpotRouterAddress,
            abi: intentSpotRouterABI,
            functionName: 'swap',
            args: [tokenIn, tokenOut, amountIn, [], '0x'],
        });

        return parseFloat(formatUnits(amountOut as bigint, tokenOutDecimals));
    } catch (error) {
        console.error(`Error fetching market price for ${tokenIn}/${tokenOut}:`, error);
        return 0;
    }
}

export const executeSpotTrade = async (intent: any, signature: `0x${string}`, orderType: string) => {

    if (!intent || !signature || !orderType) {
        throw new Error('Missing required fields');
    }

    const orderId = keccak256(signature);

    try {
        await saveOrder({ ...intent, id: orderId, status: 'open' });

        const network = relayerConfig.getNetworkByChainId(intent.chainId);
        if (!network) {
            throw new Error(`Unsupported chainId: ${intent.chainId}`);
        }

        const publicClient = createPublicClient({
            chain: base,
            transport: http(network.providerUrl),
        });

        const account = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY as `0x${string}`);

        const walletClient = createWalletClient({
            account,
            chain: base,
            transport: http(network.providerUrl),
        });

        const intentSpotRouterAddress = network.intentSpotRouterAddress as `0x${string}`;

        const price = await getMarketPrice(intent.tokenIn, intent.tokenOut, intent.chainId);

        if (orderType === 'market' || orderType === 'limit') {
            const { request } = await publicClient.simulateContract({
                address: intentSpotRouterAddress,
                abi: intentSpotRouterABI,
                functionName: 'executeSwap',
                args: [intent, signature],
                account,
            });

            const tx = await walletClient.writeContract(request);
            const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

            if (receipt.status === 'reverted') {
                throw new Error('Transaction reverted on-chain');
            }

            await updateOrderStatus(orderId, 'filled');

            return { success: true, txHash: tx, price };
        } else {
            throw new Error(`Unsupported order type: ${orderType}`);
        }

    } catch (error: any) {
        console.error('Failed to execute spot trade:', error);
        await updateOrderStatus(orderId, 'cancelled');
        throw new Error(`Failed to execute spot trade: ${error.message}`);
    }
};

export const executeSavedOrder = async (order: any) => {
    const { intent, signature, type: orderType, id: orderId } = order;

    if (!intent || !signature || !orderType || !orderId) {
        throw new Error('Missing required fields from saved order object');
    }

    try {
        const network = relayerConfig.getNetworkByChainId(intent.chainId);
        if (!network) {
            throw new Error(`Unsupported chainId: ${intent.chainId}`);
        }

        const publicClient = createPublicClient({
            chain: base,
            transport: http(network.providerUrl),
        });

        const account = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY as `0x${string}`);

        const walletClient = createWalletClient({
            account,
            chain: base,
            transport: http(network.providerUrl),
        });

        const intentSpotRouterAddress = network.intentSpotRouterAddress as `0x${string}`;

        if (orderType === 'limit') {
            const { request } = await publicClient.simulateContract({
                address: intentSpotRouterAddress,
                abi: intentSpotRouterABI,
                functionName: 'executeSwap',
                args: [intent, signature],
                account,
            });

            const tx = await walletClient.writeContract(request);
            const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

            if (receipt.status === 'reverted') {
                throw new Error('Transaction reverted on-chain');
            }

            await updateOrderStatus(orderId, 'filled');

            const price = await getMarketPrice(intent.tokenIn, intent.tokenOut, intent.chainId);
            return { success: true, txHash: tx, price };
        } else {
            throw new Error(`Matching engine tried to execute non-limit order: ${orderType}`);
        }

    } catch (error: any) {
        console.error(`Failed to execute saved order ${orderId}:`, error);
        await updateOrderStatus(orderId, 'cancelled');
        throw new Error(`Failed to execute saved order ${orderId}: ${error.message}`);
    }
};
