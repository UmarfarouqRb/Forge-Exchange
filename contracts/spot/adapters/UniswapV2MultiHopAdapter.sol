// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IAdapter} from "../interfaces/IAdapter.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {IUniswapV2Router02} from "v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract UniswapV2MultiHopAdapter is IAdapter {
    using SafeERC20 for IERC20;

    IUniswapV2Router02 public immutable router;

    constructor(address _router) {
        router = IUniswapV2Router02(_router);
    }

    function getRouter() external view override returns (address) {
        return address(router);
    }

    function quote(address tokenIn, address tokenOut, uint256 amountIn) external view override returns (uint256 amountOut) {
        address[] memory path = new address[](3);
        path[0] = tokenIn;
        // Intermediate hop for testing
        path[1] = 0xd988097FB8612CC35EEc14542143924fb94d7c4d; // axlUSDC on Base
        path[2] = tokenOut;

        try router.getAmountsOut(amountIn, path) returns (uint256[] memory amounts) {
            return amounts[amounts.length - 1];
        } catch {
            return 0;
        }
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata /*data*/
    ) external override returns (uint256 amountOut) {
        address[] memory path = new address[](3);
        path[0] = tokenIn;
        path[1] = 0xd988097FB8612CC35EEc14542143924fb94d7c4d; // axlUSDC on Base
        path[2] = tokenOut;

        uint256[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            msg.sender,
            block.timestamp
        );

        return amounts[amounts.length - 1];
    }
}
