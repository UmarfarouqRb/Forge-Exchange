// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {VaultSpot} from "../../contracts/spot/VaultSpot.sol";
import {SpotRouter} from "../../contracts/spot/SpotRouter.sol";
import {FeeController} from "../../contracts/spot/FeeController.sol";
import {PancakeV3Adapter} from "../../contracts/spot/adapters/PancakeV3Adapter.sol";
import {AerodromeAdapter} from "../../contracts/spot/adapters/AerodromeAdapter.sol";
import {IAdapter} from "../../contracts/spot/interfaces/IAdapter.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {WETH} from "../../lib/universal-router/lib/solmate/src/tokens/WETH.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract SpotTest is Test {
    VaultSpot vault;
    SpotRouter router;
    FeeController feeController;
    PancakeV3Adapter pancakeV3Adapter;
    AerodromeAdapter aerodromeAdapter;

    WETH weth;
    MockERC20 tokenA;
    MockERC20 tokenB;

    address multisig = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    function setUp() public {
        weth = new WETH();
        tokenA = new MockERC20("Token A", "TKA");
        tokenB = new MockERC20("Token B", "TKB");

        vault = new VaultSpot();
        feeController = new FeeController(multisig, 30, 5000, 0);
        router = new SpotRouter(address(vault), address(feeController));
        vault.setRouter(address(router));

        pancakeV3Adapter = new PancakeV3Adapter();
        aerodromeAdapter = new AerodromeAdapter();

        router.addAdapter(keccak256("pancakev3"), address(pancakeV3Adapter));
        router.addAdapter(keccak256("aerodrome"), address(aerodromeAdapter));
    }

    function test_Swap() public pure {
        // This is a placeholder test
        assertTrue(true);
    }
}
