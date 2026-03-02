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
    IERC20 internal constant USDC = IERC20(0x036CbD53842c5426634e7929541eC2318f3dCF7e);

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("base_sepolia"));
        adapter = new PancakeV3Adapter();
        deal(address(WETH), address(this), 100 ether);
        deal(address(USDC), address(this), 10000 * 1e6);
    }

    function test_quote() public {
        uint256 amountIn = 1 ether;
        uint256 amountOut = adapter.quote(address(WETH), address(USDC), amountIn);
        console.log("amountOut:", amountOut);
        assertTrue(amountOut > 0);
    }

    function test_swap_WETH_USDC() public {
        uint256 amountIn = 1 ether;
        WETH.approve(address(adapter), amountIn);
        uint256 balanceBefore = USDC.balanceOf(address(this));
        bytes memory path = abi.encodePacked(address(WETH), uint24(500), address(USDC));
        adapter.swap(address(WETH), address(USDC), amountIn, path);
        uint256 balanceAfter = USDC.balanceOf(address(this));
        console.log("amountOut:", balanceAfter - balanceBefore);
        assertTrue(balanceAfter > balanceBefore);
    }

    function test_swap_USDC_WETH() public {
        uint256 amountIn = 1000 * 1e6; // 1000 USDC
        USDC.approve(address(adapter), amountIn);
        uint256 balanceBefore = WETH.balanceOf(address(this));
        bytes memory path = abi.encodePacked(address(USDC), uint24(500), address(WETH));
        adapter.swap(address(USDC), address(WETH), amountIn, path);
        uint256 balanceAfter = WETH.balanceOf(address(this));
        console.log("WETH amountOut:", balanceAfter - balanceBefore);
        assertTrue(balanceAfter > balanceBefore);
    }
}
