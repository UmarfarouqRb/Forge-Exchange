// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {SpotRouter} from "contracts/spot/SpotRouter.sol";
import {IAdapter} from "contracts/spot/interfaces/IAdapter.sol";
import {IRouter as IAerodromeRouter} from "aerodrome/contracts/interfaces/IRouter.sol";
import {IPoolFactory as IAerodromeFactory} from "aerodrome/contracts/interfaces/factories/IPoolFactory.sol";

/// @title FixedAerodromeAdapter
/// @notice Test adapter for swapping on Aerodrome that pulls from the Vault.
contract FixedAerodromeAdapter is IAdapter {
    using SafeERC20 for IERC20;

    IAerodromeRouter internal constant ROUTER = IAerodromeRouter(0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43);
    IAerodromeFactory internal constant FACTORY = IAerodromeFactory(0x420DD381b31aEf6683db6B902084cB0FFECe40Da);

    /// @inheritdoc IAdapter
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes memory data
    ) external returns (uint256 amountOut) {
        bool isStable = abi.decode(data, (bool));

        // Pull tokens from the SpotRouter (msg.sender) to this adapter
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve the Aerodrome router to spend our tokens
        IERC20(tokenIn).approve(address(ROUTER), amountIn);

        // Build the route
        IAerodromeRouter.Route[] memory routes = new IAerodromeRouter.Route[](1);
        routes[0] = IAerodromeRouter.Route({
            from: tokenIn,
            to: tokenOut,
            stable: isStable,
            factory: address(FACTORY)
        });

        // Execute swap, sending the swapped tokens back to the SpotRouter (msg.sender)
        uint256[] memory amounts = ROUTER.swapExactTokensForTokens(
            amountIn,
            0,
            routes,
            msg.sender, // Send swapped tokens back to the router
            block.timestamp
        );
        amountOut = amounts[amounts.length - 1];
    }

    /// @inheritdoc IAdapter
    function quote(address tokenIn, address tokenOut, uint256 amountIn) public view returns (uint256 amountOut) {
        IAerodromeRouter.Route[] memory routes = new IAerodromeRouter.Route[](1);
        routes[0] = IAerodromeRouter.Route({
            from: tokenIn,
            to: tokenOut,
            stable: false, // Quoting with stable pools is not needed for this test
            factory: address(FACTORY)
        });

        try ROUTER.getAmountsOut(amountIn, routes) returns (uint256[] memory amounts) {
            amountOut = amounts[amounts.length - 1];
        } catch {
            return 0;
        }
    }

    /// @inheritdoc IAdapter
    function getRouter() external view returns (address) {
        return address(ROUTER);
    }
}
