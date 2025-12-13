
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IAdapter {
    function quote(address tokenIn, address tokenOut, uint256 amountIn) external returns (uint256 amountOut);

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata data
    ) external returns (uint256 amountOut);
}
