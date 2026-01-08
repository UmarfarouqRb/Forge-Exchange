
import { Request, Response } from 'express';
import { relayerConfig } from '@forge/common';
import { saveOrder, updateOrderStatus } from '@forge/database';
import { createPublicClient, createWalletClient, http, keccak256, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import IntentSpotRouter from '../../../../deployment/abi/IntentSpotRouter.json' assert { type: "json" };

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
        const amountIn = parseUnits('1', 18);
        const amountOut = await publicClient.readContract({
            address: intentSpotRouterAddress,
            abi: intentSpotRouterABI,
            functionName: 'swap',
            args: [tokenIn, tokenOut, amountIn, [], '0x'],
        });

        return parseFloat(formatUnits(amountOut as bigint, 18));
    } catch (error) {
        console.error(`Error fetching market price for ${tokenIn}/${tokenOut}:`, error);
        return 0;
    }
}

export const spot = async (req: Request, res: Response) => {
    const { intent, signature, orderType } = req.body;

    if (!intent || !signature || !orderType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const orderId = keccak256(signature);

    try {
        await saveOrder({ ...intent, id: orderId, status: 'PENDING' });

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

            await updateOrderStatus(orderId, 'SUCCESS');

            res.json({ success: true, txHash: tx, price });
        } else {
            throw new Error(`Unsupported order type: ${orderType}`);
        }

    } catch (error: any) {
        console.error('Failed to execute spot trade:', error);
        await updateOrderStatus(orderId, 'FAILED');
        res.status(500).json({ error: `Failed to execute spot trade: ${error.message}` });
    }
};
