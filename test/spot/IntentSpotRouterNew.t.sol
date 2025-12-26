// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {VaultSpot} from "../../contracts/spot/VaultSpot.sol";
import {FeeController} from "../../contracts/spot/FeeController.sol";
import {IntentSpotRouter} from "../../contracts/spot/IntentSpotRouter.sol";

contract IntentSpotRouterNewTest is Test {
    VaultSpot public vault;
    FeeController public feeController;
    IntentSpotRouter public intentSpotRouter;

    function setUp() public {
        vault = new VaultSpot();
        
        address owner = address(this);
        address treasury = address(this);
        uint256 baseFeeBps = 10;
        uint256 maxFeeBps = 100;

        feeController = new FeeController(owner, treasury, baseFeeBps, maxFeeBps);

        intentSpotRouter = new IntentSpotRouter(
            address(vault),
            address(feeController),
            "IntentSpotRouter",
            "1"
        );

        vault.setRouter(address(intentSpotRouter));

        console.log("IntentSpotRouter address:", address(intentSpotRouter));
    }

    function test_Deployment() public {
        assertTrue(address(intentSpotRouter) != address(0));
    }
}
