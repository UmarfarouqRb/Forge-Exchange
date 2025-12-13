
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IQuoterV2} from "pancake-v3-periphery/contracts/interfaces/IQuoterV2.sol";
import {ISwapRouter} from "pancake-v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";

import {IAdapter} from "../interfaces/IAdapter.sol";

contract PancakeV3Adapter is IAdapter {

    ISwapRouter internal constant ROUTER = ISwapRouter(0x1b81D678ffb9C0263b24A97847620C99d213eB14);
    IQuoterV2 internal constant QUOTER = IQuoterV2(0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997);
    uint24[] internal feeTiers; // 100, 500, 2500, 10000

    constructor() {
        feeTiers = [100, 500, 2500, 10000];
    }

    function quote(address tokenIn, address tokenOut, uint256 amountIn) external override returns (uint256 bestAmountOut) {
        for (uint256 i = 0; i < feeTiers.length; i++) {
            try QUOTER.quoteExactInputSingle(IQuoterV2.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                fee: feeTiers[i],
                sqrtPriceLimitX96: 0
            })) returns (uint256 amountOutQuote, uint160, uint32, uint256) {
                if (amountOutQuote > bestAmountOut) {
                    bestAmountOut = amountOutQuote;
                }
            } catch {}
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

        (uint24 bestFee, ) = _findBestFee(tokenIn, tokenOut, amountIn);

        amountOut = ROUTER.exactInputSingle(ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: bestFee,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        }));

        if (amountOut < minAmountOut) {
            revert("Amount out too low");
        }
    }

    function _findBestFee(address tokenIn, address tokenOut, uint256 amountIn) internal returns (uint24 bestFee, uint256 bestAmountOut) {
        for (uint256 i = 0; i < feeTiers.length; i++) {
            try QUOTER.quoteExactInputSingle(IQuoterV2.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                fee: feeTiers[i],
                sqrtPriceLimitX96: 0
            })) returns (uint256 amountOutQuote, uint160, uint32, uint256) {
                if (amountOutQuote > bestAmountOut) {
                    bestAmountOut = amountOutQuote;
                    bestFee = feeTiers[i];
                }
            } catch {}
        }
    }
}
