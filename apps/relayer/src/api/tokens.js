"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokens = void 0;
const chains_1 = require("../config/chains");
const getTokens = (req, res) => {
    const chainId = req.params.chainId;
    const chain = chains_1.chains[chainId];
    if (chain) {
        res.json(chain);
    }
    else {
        res.status(404).json({ error: 'Chain not found' });
    }
};
exports.getTokens = getTokens;
