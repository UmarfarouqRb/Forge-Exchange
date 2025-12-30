"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSigner = void 0;
const ethers_1 = require("ethers");
const getSigner = (signature, data) => {
    const message = JSON.stringify(data);
    const messageHash = ethers_1.ethers.utils.id(message);
    const signer = ethers_1.ethers.utils.recoverAddress(messageHash, signature);
    return signer;
};
exports.getSigner = getSigner;
