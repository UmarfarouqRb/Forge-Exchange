// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAdapter} from "../interfaces/IAdapter.sol";
import {IPancakeV3Factory} from "@pancakeswap/v3-core/contracts/interfaces/IPancakeV3Factory.sol";
import {IPancakeV3Pool} from "@pancakeswap/v3-core/contracts/interfaces/IPancakeV3Pool.sol";
import {IPancakeV3SwapCallback} from "@pancakeswap/v3-core/contracts/interfaces/callback/IPancakeV3SwapCallback.sol";
import {IQuoterV2} from "pancake-v3-periphery/contracts/interfaces/IQuoterV2.sol";
import {ISwapRouter} from "pancake-v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";

contract PancakeV3Adapter is IAdapter, IPancakeV3SwapCallback {
    using SafeERC20 for IERC20;

    IPancakeV3Factory public constant FACTORY = IPancakeV3Factory(0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865);
    ISwapRouter public constant ROUTER = ISwapRouter(0x1b81D678ffb9C0263b24A97847620C99d213eB14);
    IQuoterV2 public constant QUOTER = IQuoterV2(0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997);

    uint24[4] public feeTiers = [100, 500, 2500, 10000];

    struct SwapCallbackData {
        address tokenIn;
        address tokenOut;
        address payer;
    }

    function getRouter() external pure override returns (address) {
        return address(ROUTER);
    }

    function quote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external override returns (uint256 amountOut) {
        bytes memory path;
        for (uint i = 0; i < feeTiers.length; i++) {
            uint24 fee = feeTiers[i];
            address pool = FACTORY.getPool(tokenIn, tokenOut, fee);
            if (pool != address(0)) {
                path = abi.encodePacked(tokenIn, fee, tokenOut);
                break;
            }
        }
        require(path.length > 0, "No pool found");

        (uint256 quoteAmountOut, , , ) = QUOTER.quoteExactInput(path, amountIn);
        return quoteAmountOut;
    }

    function swap(
        address tokenIn,
        address,
        uint256 amountIn,
        bytes calldata data
    ) external override returns (uint256 amountOut) {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(ROUTER), amountIn);
        return ROUTER.exactInput(
            ISwapRouter.ExactInputParams({
                path: data,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
    }

    function pancakeV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external {
        SwapCallbackData memory callbackData = abi.decode(data, (SwapCallbackData));
        if (amount0Delta > 0) {
            IERC20(callbackData.tokenIn).safeTransferFrom(callbackData.payer, msg.sender, uint256(amount0Delta));
        } else if (amount1Delta > 0) {
            IERC20(callbackData.tokenOut).safeTransferFrom(callbackData.payer, msg.sender, uint256(amount1Delta));
        }
    }
}
