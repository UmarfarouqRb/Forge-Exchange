
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IUniversalRouter} from "universal-router/contracts/interfaces/IUniversalRouter.sol";
import {Commands} from "universal-router/contracts/libraries/Commands.sol";
import {IQuoterV2} from "pancake-v3-periphery/contracts/interfaces/IQuoterV2.sol"; // Using Pancake's for compatibility
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";

import {IAdapter} from "../interfaces/IAdapter.sol";

contract UniswapUniversalRouterAdapter is IAdapter {

    IUniversalRouter internal constant ROUTER = IUniversalRouter(0x6fF5693b99212Da76ad316178A184AB56D299b43);
    IQuoterV2 internal constant QUOTER = IQuoterV2(0x0d5e0F971ED27FBfF6c2837bf31316121532048D);
    uint24[] internal feeTiers;

    constructor() {
        feeTiers = [100, 500, 3000, 10000];
    }

    function quote(address tokenIn, address tokenOut, uint256 amountIn) external override returns (uint256 bestAmountOut) {
        for (uint i = 0; i < feeTiers.length; i++) {
            try QUOTER.quoteExactInputSingle(IQuoterV2.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                fee: feeTiers[i],
                sqrtPriceLimitX96: 0
            })) returns (uint256 quotedAmountOut, uint160, uint32, uint256) {
                if (quotedAmountOut > bestAmountOut) {
                    bestAmountOut = quotedAmountOut;
                }
            } catch {}
        }
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata data
    ) external override returns (uint256 amountOut) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        if (IERC20(tokenIn).allowance(address(this), address(ROUTER)) > 0) {
            IERC20(tokenIn).approve(address(ROUTER), 0);
        }
        IERC20(tokenIn).approve(address(ROUTER), amountIn);
        
        uint24 fee = abi.decode(data, (uint24));

        bytes memory commands = abi.encodePacked(bytes1(uint8(Commands.V3_SWAP_EXACT_IN)));
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(msg.sender, amountIn, minAmountOut, abi.encodePacked(tokenIn, fee, tokenOut), false);

        ROUTER.execute(commands, inputs);

        amountOut = IERC20(tokenOut).balanceOf(msg.sender);
    }
}
