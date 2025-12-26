import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { relayerConfig } from '../config/config';
import { getChainId, getUserAddress, saveSession } from '../db/db';

export async function authorizeSession(req: Request, res: Response) {
    const { sessionKey, expiration, signature } = req.body;

    const chainId = await getChainId(); // a function to get the chainId from the db
    const verifyingContract = relayerConfig.networks[chainId]?.sessionKeyManagerAddress;

    if (!verifyingContract) {
        return res.status(400).json({ error: 'Unsupported chainId' });
    }

    const typedData = {
        domain: {
            name: 'SessionKeyManager',
            version: '1',
            chainId,
            verifyingContract,
        },
        types: {
            Authorization: [
                { name: 'sessionKey', type: 'address' },
                { name: 'expiration', type: 'uint256' },
            ],
        },
        primaryType: 'Authorization',
        message: {
            sessionKey,
            expiration,
        },
    };

    try {
        const recoveredAddress = ethers.utils.verifyTypedData(
            typedData.domain,
            typedData.types,
            typedData.message,
            signature
        );

        // Here you would typically get the user's address from a database or other source
        const userAddress = await getUserAddress(); // a function to get the user address from the db

        if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        await saveSession(sessionKey, expiration);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
