"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spot = void 0;
const config_1 = require("../config");
const IntentSpotRouter__factory_1 = require("../contracts/factories/IntentSpotRouter__factory");
const db_1 = require("../db/db");
const ethers_1 = require("ethers");
const spot = async (req, res) => {
    const { intent, signature, orderType } = req.body;
    if (!intent || !signature || !orderType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const orderId = ethers_1.ethers.utils.keccak256(signature); // Generate a unique ID for the order
    try {
        await (0, db_1.saveOrder)({ ...intent, id: orderId, status: 'PENDING' });
        const network = config_1.relayerConfig.getNetworkByChainId(intent.chainId);
        if (!network) {
            throw new Error(`Unsupported chainId: ${intent.chainId}`);
        }
        const signer = await config_1.relayerConfig.getSigner(network.name);
        const intentSpotRouterAddress = network.intentSpotRouterAddress;
        const intentSpotRouter = IntentSpotRouter__factory_1.IntentSpotRouter__factory.connect(intentSpotRouterAddress, signer);
        if (orderType === 'market' || orderType === 'limit') {
            const tx = await intentSpotRouter.executeSwap(intent, signature);
            const receipt = await tx.wait();
            if (receipt.status === 0) { // Transaction failed
                throw new Error('Transaction reverted on-chain');
            }
            await (0, db_1.updateOrderStatus)(orderId, 'SUCCESS');
            res.json({ success: true, txHash: tx.hash });
        }
        else {
            throw new Error(`Unsupported order type: ${orderType}`);
        }
    }
    catch (error) {
        console.error('Failed to execute spot trade:', error);
        await (0, db_1.updateOrderStatus)(orderId, 'FAILED');
        res.status(500).json({ error: `Failed to execute spot trade: ${error.message}` });
    }
};
exports.spot = spot;
