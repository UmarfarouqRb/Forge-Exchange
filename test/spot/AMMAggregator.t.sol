// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AMMAggregator} from "../../contracts/spot/AMMAggregator.sol";
import {PancakeV3Adapter} from "../../contracts/spot/adapters/PancakeV3Adapter.sol";
import {AerodromeAdapter} from "../../contracts/spot/adapters/AerodromeAdapter.sol";
import {IAdapter} from "../../contracts/spot/interfaces/IAdapter.sol";

contract AMMAggregatorTest is Test {
    AMMAggregator aggregator;
    PancakeV3Adapter pancakeV3Adapter;
    AerodromeAdapter aerodromeAdapter;

    function setUp() public {
        pancakeV3Adapter = new PancakeV3Adapter();
        aerodromeAdapter = new AerodromeAdapter();
        aggregator = new AMMAggregator(address(this));
        aggregator.addAdapter("pancakev3", address(pancakeV3Adapter));
        aggregator.addAdapter("aerodrome", address(aerodromeAdapter));
    }

    function test_GetBestQuote() public pure {
        // This is a placeholder test
        assertTrue(true);
    }
}
