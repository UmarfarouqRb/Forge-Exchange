// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {V3Adapter} from "./base/V3Adapter.sol";

/// @title PancakeV3Adapter
/// @notice Adapter for the PancakeSwap V3 protocol.
contract PancakeV3Adapter is V3Adapter {
    constructor(address _router, address _quoter) V3Adapter(_quoter, _router) {
        // Set the fee tiers for PancakeSwap V3
        // 0.01%, 0.05%, 0.25%, 1%
        feeTiers = [100, 500, 2500, 10000];
    }
}