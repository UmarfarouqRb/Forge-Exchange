import { Request, Response } from 'express';
import { relayerConfig } from '../config';
import { IntentSpotRouter__factory } from '../../../../out/IntentSpotRouter.sol/IntentSpotRouter.json';
import { saveOrder, updateOrderStatus } from '../db/db';

export const spot = async (req: Request, res: Response) => {
    const { intent, signature } = req.body;
    const network = req.query.network as 'base' | 'local' || 'local';

    if (!intent || !signature) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save the initial order with PENDING status
    await saveOrder(intent);

    try {
        const signer = await relayerConfig.getSigner(network);
        const intentSpotRouterAddress = relayerConfig.networks[network].intentSpotRouterAddress;
        const intentSpotRouter = IntentSpotRouter__factory.connect(intentSpotRouterAddress, signer);

        const tx = await intentSpotRouter.executeSwap(intent, signature);
        const receipt = await tx.wait();

        // If tx.wait() does not throw, the transaction was successful
        await updateOrderStatus(intent.id, 'SUCCESS');

        res.json({ success: true, txHash: tx.hash });

    } catch (error: any) {
        console.error('Failed to execute swap:', error);
        // Update order status to FAILED on error
        await updateOrderStatus(intent.id, 'FAILED');
        res.status(500).json({ error: `Failed to execute swap: ${error.message}` });
    }
};
