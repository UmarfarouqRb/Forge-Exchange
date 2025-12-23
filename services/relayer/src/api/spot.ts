import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { GaslessTrader__factory } from '../../../../foundry/out/GaslessTrader.sol/GaslessTrader.json';

const GASLESS_TRADER_ADDRESS = '0x...'; // Replace with the deployed address of GaslessTrader.sol

async function getSigner() {
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    const signer = provider.getSigner();
    return signer;
}

export const spot = async (req: Request, res: Response) => {
    const { order, sessionKeySignature } = req.body;

    if (!order || !sessionKeySignature) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const signer = await getSigner();
    const gaslessTrader = GaslessTrader__factory.connect(GASLESS_TRADER_ADDRESS, signer);

    try {
        const tx = await gaslessTrader.executeTrade(order, sessionKeySignature);
        await tx.wait();

        res.json({ success: true, txHash: tx.hash });
    } catch (error) {
        console.error('Failed to execute trade:', error);
        res.status(500).json({ error: 'Failed to execute trade' });
    }
};
