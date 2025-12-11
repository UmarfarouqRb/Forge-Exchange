// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IAdapter} from "../interfaces/IAdapter.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IPancakeV3SwapCallback} from "pancake-v3-core/contracts/interfaces/callback/IPancakeV3SwapCallback.sol";

// V3 specific imports
import {IQuoterV2} from "pancake-v3-periphery/contracts/interfaces/IQuoterV2.sol";
import {ISwapRouter} from "pancake-v3-periphery/contracts/interfaces/ISwapRouter.sol";

/// @title PancakeV3Adapter
/// @notice Adapter for the official PancakeSwap V3 protocol.
/// @dev This contract is a V3 adapter that also implements the IPancakeV3SwapCallback interface.
contract PancakeV3Adapter is IAdapter, IPancakeV3SwapCallback {
    using SafeERC20 for IERC20;

    IQuoterV2 public immutable quoter;
    ISwapRouter public immutable router;

    // We can't use a mapping since we need to iterate through the fees
    uint24[] internal feeTiers;

    constructor(address _quoter, address _router) {
        quoter = IQuoterV2(_quoter);
        router = ISwapRouter(_router);

        // Set the fee tiers for PancakeSwap V3
        // 0.01%, 0.05%, 0.25%, 1%
        feeTiers = [100, 500, 2500, 10000];
    }

    /// @notice Callback function for PancakeSwap V3 swaps.
    function pancakeV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata /*data*/
    ) external pure {
        // We don't need to do anything here since the swap is already handled
        // by the router. This is just to satisfy the interface.
        require(amount0Delta > 0 || amount1Delta > 0);
    }

    /// @notice Finds the best fee tier and quote for a given path.
    /// @dev Iterates through the available fee tiers to find the pool with the best rate.
    function _findBestFee(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint24 bestFee, uint256 bestAmountOut) {
        uint256 bestOut = 0;
        uint24 fee = 0;

        for (uint256 i = 0; i < feeTiers.length; i++) {
            try
                quoter.quoteExactInputSingle(
                    IQuoterV2.QuoteExactInputSingleParams({
                        tokenIn: tokenIn,
                        tokenOut: tokenOut,
                        amountIn: amountIn,
                        fee: feeTiers[i],
                        sqrtPriceLimitX96: 0
                    })
                )
            returns (
                uint256 amountOutQuote,
                uint160,
                uint32,
                uint256
            )
            {
                if (amountOutQuote > bestOut) {
                    bestOut = amountOutQuote;
                    fee = feeTiers[i];
                }
            } catch {
                // Ignore if the pool doesn't exist for this fee tier
            }
        }
        return (fee, bestOut);
    }

    /// @inheritdoc IAdapter
    function quote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external override returns (uint256 amountOut) {
        (uint24 fee, uint256 out) = _findBestFee(
            tokenIn,
            tokenOut,
            amountIn
        );

        if (fee == 0) return 0; // Return 0 if no pool is found

        return out;
    }

    /// @inheritdoc IAdapter
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata /*data*/
    ) external override returns (uint256 amountOut) {
        // Transfer tokens from the caller (AMMAggregator) to this adapter
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Find the best fee tier for the swap
        (uint24 fee, ) = _findBestFee(tokenIn, tokenOut, amountIn);
        require(fee != 0, "V3Adapter: No pool found");

        // Approve the router to spend the tokens
        IERC20(tokenIn).safeIncreaseAllowance(address(router), amountIn);

        // Execute the swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            });

        amountOut = router.exactInputSingle(params);

        // Reset allowance
        IERC20(tokenIn).safeDecreaseAllowance(address(router), amountIn);

        return amountOut;
    }
}
