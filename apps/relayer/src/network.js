"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provider = void 0;
const ethers_1 = require("ethers");
const config_1 = require("./config/config");
exports.provider = new ethers_1.ethers.providers.JsonRpcProvider(config_1.config.provider);
