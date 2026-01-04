// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console, console2} from "forge-std/Test.sol";
import {PancakeV3Adapter} from "contracts/spot/adapters/PancakeV3Adapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PancakeV3AdapterTest is Test {
    using SafeERC20 for IERC20;

    PancakeV3Adapter internal adapter;
    IERC20 internal constant WETH = IERC20(0x4200000000000000000000000000000000000006);
    IERC20 internal constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("base"));
        adapter = new PancakeV3Adapter();
        deal(address(WETH), address(this), 100 ether);
    }

    function test_quote() public {
        uint256 amountIn = 1 ether;
        uint256 amountOut = adapter.quote(address(WETH), address(USDC), amountIn);
        console.log("amountOut:", amountOut);
        assertTrue(amountOut > 0);
    }

    function test_swap() public {
        uint256 amountIn = 1 ether;
        WETH.approve(address(adapter), amountIn);
        uint256 balanceBefore = USDC.balanceOf(address(this));
        bytes memory path = abi.encodePacked(address(WETH), uint24(500), address(USDC));
        adapter.swap(address(WETH), address(USDC), amountIn, path);
        uint256 balanceAfter = USDC.balanceOf(address(this));
        console.log("amountOut:", balanceAfter - balanceBefore);
        assertTrue(balanceAfter > balanceBefore);
    }
}
