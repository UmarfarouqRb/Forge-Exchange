// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {V3Adapter} from "./base/V3Adapter.sol";

/// @title UniswapV3Adapter
/// @notice Adapter for the official Uniswap V3 protocol.
contract UniswapV3Adapter is V3Adapter {
    constructor(address _router, address _quoter) V3Adapter(_quoter, _router) {
        // Set the fee tiers for Uniswap V3
        feeTiers = [100, 500, 3000, 10000];
    }
}