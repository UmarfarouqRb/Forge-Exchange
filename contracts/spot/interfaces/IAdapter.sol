// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAdapter {
    function getRouter() external view returns (address);

    function quote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut);

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes calldata data
    ) external returns (uint256 amountOut);
}
