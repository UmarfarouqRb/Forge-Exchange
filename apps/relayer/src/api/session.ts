import { Request, Response } from 'express';
import { verifyTypedData } from 'viem';
import { relayerConfig } from '@forge/common';
import { getChainId, getUserAddress, saveSession } from '@forge/database';

export async function authorizeSession(req: Request, res: Response) {
    const { sessionKey, expiration, signature } = req.body;

    const chainId = await getChainId(); // a function to get the chainId from the db
    const network = relayerConfig.getNetworkByChainId(Number(chainId));

    if (!network) {
        return res.status(400).json({ error: 'Unsupported chainId' });
    }

    const domain = {
        name: 'SessionKeyManager',
        version: '1',
        chainId: Number(chainId),
        verifyingContract: network.sessionKeyManagerAddress as `0x${string}`,
    };

    const types = {
        Authorization: [
            { name: 'sessionKey', type: 'address' },
            { name: 'expiration', type: 'uint256' },
        ],
    };

    const message = {
        sessionKey,
        expiration,
    };

    try {
        const userAddress = await getUserAddress(); // a function to get the user address from the db

        const isValid = await verifyTypedData({
            address: userAddress as `0x${string}`,
            domain,
            types,
            primaryType: 'Authorization',
            message,
            signature: signature as `0x${string}`,
        });

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        await saveSession(sessionKey, expiration);

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
