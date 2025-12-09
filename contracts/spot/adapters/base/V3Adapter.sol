// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IAdapter} from "../../interfaces/IAdapter.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IQuoterV2} from "v3-periphery/contracts/interfaces/IQuoterV2.sol";
import {ISwapRouter} from "v3-periphery/contracts/interfaces/ISwapRouter.sol";

/// @title V3Adapter
/// @notice Abstract base contract for Uniswap V3 and compatible forks.
/// @dev This contract is not meant to be deployed directly. Instead, inherit from it
///      and provide the correct router, quoter, and fee tier values.
abstract contract V3Adapter is IAdapter {
    using SafeERC20 for IERC20;

    IQuoterV2 public immutable quoter;
    ISwapRouter public immutable router;

    uint24[] internal feeTiers;

    constructor(address _quoter, address _router) {
        quoter = IQuoterV2(_quoter);
        router = ISwapRouter(_router);
    }

    /// @notice Finds the best fee tier and quote for a given path.
    /// @dev Iterates through the available fee tiers to find the pool with the best rate.
    function _findBestFee(address tokenIn, address tokenOut, uint256 amountIn) internal returns (uint24 bestFee, uint256 bestAmountOut) {
        uint256 bestOut = 0;
        uint24 fee = 0;

        for (uint256 i = 0; i < feeTiers.length; i++) {
            try quoter.quoteExactInputSingle(
                IQuoterV2.QuoteExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    amountIn: amountIn,
                    fee: feeTiers[i],
                    sqrtPriceLimitX96: 0
                })
            ) returns (uint256 amountOutQuote, uint160, uint32, uint256) {
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
    function quote(address tokenIn, address tokenOut, uint256 amountIn) external virtual override returns (uint256 amountOut) {
        (, amountOut) = _findBestFee(tokenIn, tokenOut, amountIn);
        return amountOut;
    }

    /// @inheritdoc IAdapter
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata /*data*/
    ) external virtual override returns (uint256 amountOut) {
        // Transfer tokens from the caller (AMMAggregator) to this adapter
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Find the best fee tier for the swap
        (uint24 fee, ) = _findBestFee(tokenIn, tokenOut, amountIn);
        require(fee != 0, "V3Adapter: No pool found");

        // Approve the router to spend the tokens
        IERC20(tokenIn).safeIncreaseAllowance(address(router), amountIn);

        // Execute the swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: msg.sender, // The AMMAggregator will receive the tokens
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
