// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {UniswapV3Adapter} from "contracts/spot/adapters/UniswapV3Adapter.sol";
import {WETH} from "solmate/tokens/WETH.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";

contract UniswapV3AdapterTest is Test {
    // --- Constants ---
    string public constant BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org";
    uint256 public constant FORK_BLOCK = 38_267_000;

    // --- Contracts ---
    UniswapV3Adapter internal adapter;

    // --- Tokens ---
    WETH internal weth = WETH(payable(0x4200000000000000000000000000000000000006));
    IERC20 internal usdc = IERC20(0x036CbD53842c5426634e7929541eC2318f3dCF7e);

    // --- Users ---
    address internal user = address(0x1);

    function setUp() public {
        vm.createSelectFork(BASE_SEPOLIA_RPC_URL, FORK_BLOCK);

        adapter = new UniswapV3Adapter();

        vm.deal(user, 10 ether);
        vm.startPrank(user);
        weth.deposit{value: 1 ether}();
        vm.stopPrank();
    }

    function test_quote() public {
        uint256 amountIn = 1 ether;
        uint256 amountOut = adapter.quote(address(weth), address(usdc), amountIn);
        assertTrue(amountOut > 0, "Quote should be greater than 0");
    }

    function test_swap() public {
        uint256 amountIn = 1 ether;
        uint24 bestFee = 0;
        uint256 maxAmountOut = 0;

        uint24[] memory feeTiers = adapter.getFeeTiers();
        for (uint i = 0; i < feeTiers.length; i++) {
            uint24 fee = feeTiers[i];
            try adapter.quote(address(weth), address(usdc), amountIn) returns (uint256 amountOut) {
                if (amountOut > maxAmountOut) {
                    maxAmountOut = amountOut;
                    bestFee = fee;
                }
            } catch {}
        }

        assertTrue(bestFee > 0, "Could not find a valid fee tier for the swap");

        uint256 usdcBalanceBefore = usdc.balanceOf(user);

        vm.startPrank(user);
        weth.approve(address(adapter), amountIn);
        adapter.swap(address(weth), address(usdc), amountIn, abi.encode(bestFee));
        vm.stopPrank();

        uint256 usdcBalanceAfter = usdc.balanceOf(user);
        assertTrue(usdcBalanceAfter > usdcBalanceBefore, "USDC balance should increase after swap");
    }
}
