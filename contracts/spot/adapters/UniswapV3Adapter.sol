// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAdapter} from "../interfaces/IAdapter.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IQuoterV2} from "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";

contract UniswapV3Adapter is IAdapter {
    using SafeERC20 for IERC20;

    ISwapRouter public constant ROUTER = ISwapRouter(0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4);
    IQuoterV2 public constant QUOTER = IQuoterV2(0x3d4e44eB1374240Ce5F1b871aB261CD16335154a);

    uint24[] public feeTiers = [100, 500, 3000, 10000];

    function getRouter() external pure override returns (address) {
        return address(ROUTER);
    }

    function getFeeTiers() external view returns (uint24[] memory) {
        return feeTiers;
    }

    function quote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external override returns (uint256 maxAmountOut) {
        maxAmountOut = 0;

        for (uint i = 0; i < feeTiers.length; i++) {
            try QUOTER.quoteExactInputSingle(IQuoterV2.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                fee: feeTiers[i],
                sqrtPriceLimitX96: 0
            })) returns (uint256 amountOutQuote, uint160, uint32, uint256) {
                if (amountOutQuote > maxAmountOut) {
                    maxAmountOut = amountOutQuote;
                }
            } catch {
                // Ignore fees with no liquidity
            }
        }

        return maxAmountOut;
    }

    function swap(
      address tokenIn,
      address tokenOut,
      uint256 amountIn,
      bytes calldata data
    ) external override returns (uint256 amountOut) {
      uint24 fee = abi.decode(data, (uint24));

      IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
      IERC20(tokenIn).approve(address(ROUTER), amountIn);

      ISwapRouter.ExactInputSingleParams memory params =
        ISwapRouter.ExactInputSingleParams({
          tokenIn: tokenIn,
          tokenOut: tokenOut,
          fee: fee,
          recipient: msg.sender,
          deadline: block.timestamp,
          amountIn: amountIn,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0
        });

      amountOut = ROUTER.exactInputSingle(params);
    }

    function executeSwap(
      // address tokenIn,
      // address tokenOut,
      // uint256 amountIn,
      // uint256 minAmountOut,
      // address recipient
    ) external pure returns (uint256 /*amountOut*/) {
      revert("executeSwap: Not implemented with dynamic fees");
    }
}
