"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provider = void 0;
var ethers_1 = require("ethers");
var config_1 = require("./config");
exports.provider = new ethers_1.ethers.providers.JsonRpcProvider(config_1.config.provider);
