
import { Request, Response } from 'express';
import { relayerConfig } from '../config';
import { IntentSpotRouter__factory } from '../contracts/factories/IntentSpotRouter__factory';
import { saveOrder, updateOrderStatus } from '../db/db';
import { ethers } from 'ethers';

export const spot = async (req: Request, res: Response) => {
    const { intent, signature, orderType } = req.body;

    if (!intent || !signature || !orderType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const orderId = ethers.keccak256(signature); // Generate a unique ID for the order

    try {
        await saveOrder({ ...intent, id: orderId, status: 'PENDING' });

        const network = relayerConfig.getNetworkByChainId(intent.chainId);
        if (!network) {
            throw new Error(`Unsupported chainId: ${intent.chainId}`);
        }

        const signer = await relayerConfig.getSigner(network.name);
        const intentSpotRouterAddress = network.intentSpotRouterAddress;
        const intentSpotRouter = IntentSpotRouter__factory.connect(intentSpotRouterAddress, signer);

        if (orderType === 'market' || orderType === 'limit') {
            const tx = await intentSpotRouter.executeSwap(intent, signature);
            const receipt = await tx.wait();

            if (!receipt || receipt.status === 0) { // Transaction failed
                throw new Error('Transaction reverted on-chain');
            }

            await updateOrderStatus(orderId, 'SUCCESS');

            res.json({ success: true, txHash: tx.hash });
        } else {
            throw new Error(`Unsupported order type: ${orderType}`);
        }

    } catch (error: any) {
        console.error('Failed to execute spot trade:', error);
        await updateOrderStatus(orderId, 'FAILED');
        res.status(500).json({ error: `Failed to execute spot trade: ${error.message}` });
    }
};
