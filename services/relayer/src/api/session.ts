import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { SessionKeyManager__factory } from '../../../../foundry/out/SessionKeyManager.sol/SessionKeyManager.json';

const SESSION_KEY_MANAGER_ADDRESS = '0x...'; // Replace with the deployed address of SessionKeyManager.sol

async function getSigner() {
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    const signer = provider.getSigner();
    return signer;
}

export const authorizeSession = async (req: Request, res: Response) => {
    const { sessionKey, expiration, signature } = req.body;

    if (!sessionKey || !expiration || !signature) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const signer = await getSigner();
    const sessionKeyManager = SessionKeyManager__factory.connect(SESSION_KEY_MANAGER_ADDRESS, signer);

    try {
        const tx = await sessionKeyManager.authorizeSessionKey(sessionKey, expiration, signature);
        await tx.wait();

        res.json({ success: true, txHash: tx.hash });
    } catch (error) {
        console.error('Failed to authorize session key:', error);
        res.status(500).json({ error: 'Failed to authorize session key' });
    }
};
