
import { Request, Response } from 'express';
import { relayerConfig } from '@forge/common';
import { saveOrder, updateOrderStatus } from '@forge/db';
import { createPublicClient, createWalletClient, http, keccak256, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import IntentSpotRouter from '../../../../deployment/abi/IntentSpotRouter.json' assert { type: "json" };
import { getTokenDecimals } from '../utils/tokens';

const intentSpotRouterABI = IntentSpotRouter.abi;

async function getMarketPrice(tokenIn: string, tokenOut: string, chainId: number): Promise<number> {
    console.log(`Fetching market price for ${tokenIn}/${tokenOut} on chainId: ${chainId}`);
    const network = relayerConfig.getNetworkByChainId(chainId);
    if (!network) {
        console.error(`Unsupported chainId: ${chainId}`);
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
        console.log(`Fetching swap simulation with amountIn: ${amountIn}`);
        
        const amountOut = await publicClient.readContract({
            address: intentSpotRouterAddress,
            abi: intentSpotRouterABI,
            functionName: 'swap',
            args: [tokenIn, tokenOut, amountIn, [], '0x'],
        });

        const formattedAmountOut = parseFloat(formatUnits(amountOut as bigint, tokenOutDecimals));
        console.log(`Market price received: ${formattedAmountOut}`);
        return formattedAmountOut;
    } catch (error) {
        console.error(`Error fetching market price for ${tokenIn}/${tokenOut}:`, error);
        return 0;
    }
}

export const spot = async (req: Request, res: Response) => {
    const { intent, signature, orderType } = req.body;
    console.log('Received spot trade request:', { intent, signature, orderType });

    if (!intent || !signature || !orderType) {
        console.error('Missing required fields in spot trade request');
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const orderId = keccak256(signature);
    console.log(`Generated orderId: ${orderId}`);

    try {
        console.log('Saving order to database...');
        await saveOrder({ ...intent, id: orderId, status: 'open' });
        console.log('Order saved successfully');

        const network = relayerConfig.getNetworkByChainId(intent.chainId);
        if (!network) {
            console.error(`Unsupported chainId: ${intent.chainId}`);
            throw new Error(`Unsupported chainId: ${intent.chainId}`);
        }

        console.log('Creating public and wallet clients...');
        const publicClient = createPublicClient({
            chain: base,
            transport: http(network.providerUrl),
        });

        const account = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY as `0x${string}`);
        console.log(`Using relayer account: ${account.address}`);

        const walletClient = createWalletClient({
            account,
            chain: base,
            transport: http(network.providerUrl),
        });

        const intentSpotRouterAddress = network.intentSpotRouterAddress as `0x${string}`;

        const price = await getMarketPrice(intent.tokenIn, intent.tokenOut, intent.chainId);

        if (orderType === 'market' || orderType === 'limit') {
            console.log(`Executing ${orderType} order...`);
            const { request } = await publicClient.simulateContract({
                address: intentSpotRouterAddress,
                abi: intentSpotRouterABI,
                functionName: 'executeSwap',
                args: [intent, signature],
                account,
            });

            console.log('Contract simulation successful, sending transaction...');
            const tx = await walletClient.writeContract(request);
            console.log(`Transaction sent with hash: ${tx}`);

            const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
            console.log('Transaction receipt received:', receipt);

            if (receipt.status === 'reverted') {
                console.error('Transaction reverted on-chain');
                throw new Error('Transaction reverted on-chain');
            }

            console.log('Updating order status to filled...');
            await updateOrderStatus(orderId, 'filled');
            console.log('Order status updated to filled');

            res.json({ success: true, txHash: tx, price });
        } else {
            console.error(`Unsupported order type: ${orderType}`);
            throw new Error(`Unsupported order type: ${orderType}`);
        }

    } catch (error: any) {
        console.error('Failed to execute spot trade:', error);
        await updateOrderStatus(orderId, 'canceled');
        res.status(500).json({ error: `Failed to execute spot trade: ${error.message}` });
    }
};
