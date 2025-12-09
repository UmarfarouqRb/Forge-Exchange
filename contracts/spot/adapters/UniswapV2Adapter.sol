// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IAdapter} from "../interfaces/IAdapter.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IUniswapV2Router02} from "v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

/// @title UniswapV2Adapter
/// @notice Adapter for Uniswap V2 and compatible forks (e.g., SushiSwap).
/// @dev This adapter interacts with a Uniswap V2 router to provide quotes and execute swaps.
contract UniswapV2Adapter is IAdapter {
    using SafeERC20 for IERC20;

    IUniswapV2Router02 public immutable router;

    /// @param _router The address of the Uniswap V2 compatible router.
    constructor(address _router) {
        router = IUniswapV2Router02(_router);
    }

    /// @inheritdoc IAdapter
    function quote(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        try router.getAmountsOut(amountIn, path) returns (uint256[] memory amounts) {
            return amounts[1];
        } catch {
            return 0;
        }
    }

    /// @inheritdoc IAdapter
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata /*data*/
    ) external returns (uint256 amountOut) {
        // Transfer tokens from the caller (which is the AMMAggregator)
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve the Uniswap V2 router to spend the tokens
        IERC20(tokenIn).safeIncreaseAllowance(address(router), amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            msg.sender, // The AMMAggregator will receive the output tokens
            block.timestamp
        );

        // Reset allowance
        IERC20(tokenIn).safeDecreaseAllowance(address(router), amountIn);

        return amounts[1];
    }
}
