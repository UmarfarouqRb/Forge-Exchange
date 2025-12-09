// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IAdapter {
    /// @notice Quote amount out for amountIn for token pair on this adapter
    /// @dev returns 0 if not available
    function quote(address tokenIn, address tokenOut, uint256 amountIn) external returns (uint256 amountOut);

    /// @notice Execute swap. Adapter must transfer tokens and return actual amount out
    /// @dev Adapter must handle approvals and revert on failure
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, bytes calldata data) external returns (uint256 amountOut);
}