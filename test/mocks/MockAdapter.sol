// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAdapter} from "../../contracts/spot/interfaces/IAdapter.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";

contract MockAdapter is IAdapter {
    using SafeERC20 for IERC20;

    mapping(address => mapping(address => mapping(uint256 => uint256))) public amountOuts;

    function getRouter() external view returns (address) {
        return msg.sender;
    }

    function quote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256) {
        return amountOuts[tokenIn][tokenOut][amountIn];
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes calldata data
    ) external returns (uint256 amountOut) {
        amountOut = amountOuts[tokenIn][tokenOut][amountIn];
        require(amountOut > 0, "MockAdapter: amountOut not set");

        // The `data` parameter is not used in this mock, but it is required by the interface
        (address to) = abi.decode(data, (address));
        IERC20(tokenOut).safeTransfer(to, amountOut);

        return amountOut;
    }

    // --- Test setup functions ---

    function setAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 _amountOut
    ) public virtual {
        amountOuts[tokenIn][tokenOut][amountIn] = _amountOut;
    }
}
