"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSigner = void 0;
var ethers_1 = require("ethers");
var getSigner = function (signature, data) {
    var message = JSON.stringify(data);
    var messageHash = ethers_1.ethers.utils.id(message);
    var signer = ethers_1.ethers.utils.recoverAddress(messageHash, signature);
    return signer;
};
exports.getSigner = getSigner;
