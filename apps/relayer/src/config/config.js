"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    provider: 'http://localhost:8545',
    networks: {
        'base': {
            chainId: 8453,
            sessionKeyManagerAddress: '0x0000000000000000000000000000000000000000',
            intentSpotRouterAddress: '0x0000000000000000000000000000000000000000'
        }
    }
};
