"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeSession = void 0;
const ethers_1 = require("ethers");
const config_1 = require("../config");
const db_1 = require("../db/db");
async function authorizeSession(req, res) {
    const { sessionKey, expiration, signature } = req.body;
    const chainId = await (0, db_1.getChainId)(); // a function to get the chainId from the db
    const verifyingContract = config_1.relayerConfig.networks[chainId]?.sessionKeyManagerAddress;
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
        const recoveredAddress = ethers_1.ethers.utils.verifyTypedData(typedData.domain, typedData.types, typedData.message, signature);
        // Here you would typically get the user's address from a database or other source
        const userAddress = await (0, db_1.getUserAddress)(); // a function to get the user address from the db
        if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        await (0, db_1.saveSession)(sessionKey, expiration);
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
exports.authorizeSession = authorizeSession;
