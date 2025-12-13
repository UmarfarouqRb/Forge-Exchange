
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IUniswapV2Router02} from "v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";

import {IAdapter} from "../interfaces/IAdapter.sol";

contract SushiV2Adapter is IAdapter {

    IUniswapV2Router02 internal constant ROUTER = IUniswapV2Router02(0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24); // SushiSwap on Base

    function quote(address tokenIn, address tokenOut, uint256 amountIn) external view override returns (uint256 amountOut) {
        try ROUTER.getAmountsOut(amountIn, getPath(tokenIn, tokenOut)) returns (uint[] memory amounts) {
            amountOut = amounts[1];
        } catch {
            amountOut = 0;
        }
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata
    ) external override returns (uint256 amountOut) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        if (IERC20(tokenIn).allowance(address(this), address(ROUTER)) > 0) {
            IERC20(tokenIn).approve(address(ROUTER), 0);
        }
        IERC20(tokenIn).approve(address(ROUTER), amountIn);

        uint[] memory amounts = ROUTER.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            getPath(tokenIn, tokenOut),
            msg.sender,
            block.timestamp
        );
        amountOut = amounts[1];

        if (amountOut < minAmountOut) {
            revert("Amount out too low");
        }
    }

    function getPath(address tokenIn, address tokenOut) private pure returns (address[] memory) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        return path;
    }
}
