// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAdapter} from "../interfaces/IAdapter.sol";
import {IRouter as IAerodromeRouter} from "aerodrome/contracts/interfaces/IRouter.sol";
import {IPoolFactory as IAerodromeFactory} from "aerodrome/contracts/interfaces/factories/IPoolFactory.sol";
import {IPool as IAerodromePool} from "aerodrome/contracts/interfaces/IPool.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";

contract AerodromeAdapter is IAdapter {
    using SafeERC20 for IERC20;

    IAerodromeRouter public constant ROUTER = IAerodromeRouter(0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43);
    IAerodromeFactory public constant FACTORY = IAerodromeFactory(0x420DD381b31aEf6683db6B902084cB0FFECe40Da);

    function getRouter() external pure override returns (address) {
        return address(ROUTER);
    }

    function quote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view override returns (uint256 amountOut) {
        IAerodromeRouter.Route[] memory routes = new IAerodromeRouter.Route[](1);
        routes[0] = IAerodromeRouter.Route({
            from: tokenIn,
            to: tokenOut,
            stable: false, // Assume volatile for quoting
            factory: address(FACTORY)
        });

        try ROUTER.getAmountsOut(amountIn, routes) returns (uint256[] memory amounts) {
            return amounts[amounts.length - 1];
        } catch {
            // Fallback to stable if volatile quote fails
            routes[0].stable = true;
            try ROUTER.getAmountsOut(amountIn, routes) returns (uint256[] memory amounts) {
                return amounts[amounts.length - 1];
            } catch {
                return 0;
            }
        }
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes calldata data
    ) external override returns (uint256 amountOut) {
        // The data is not a bool, it's the user address. We don't use it.
        // (bool isStable) = abi.decode(data, (bool)); // This is the bug.

        IAerodromeRouter.Route[] memory routes = new IAerodromeRouter.Route[](1);
        routes[0] = IAerodromeRouter.Route({
            from: tokenIn,
            to: tokenOut,
            stable: false, // Assume volatile first
            factory: address(FACTORY)
        });

        try ROUTER.getAmountsOut(amountIn, routes) {
            // isStable is already false
        } catch {
            routes[0].stable = true;
        }
        
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(ROUTER), amountIn);

        uint256[] memory amounts = ROUTER.swapExactTokensForTokens(
            amountIn,
            0,
            routes,
            msg.sender,
            block.timestamp
        );

        return amounts[amounts.length - 1];
    }
}
