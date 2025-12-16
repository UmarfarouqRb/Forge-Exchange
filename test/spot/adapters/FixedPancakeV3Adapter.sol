// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {SpotRouter} from "contracts/spot/SpotRouter.sol";
import {IPancakeV3Pool} from "lib/pancake-v3-contracts/projects/v3-core/contracts/interfaces/IPancakeV3Pool.sol";
import {IAdapter} from "contracts/spot/interfaces/IAdapter.sol";
import {PancakeV3Helper} from "test/spot/helpers/PancakeV3Helper.sol";

contract FixedPancakeV3Adapter is IAdapter {
    using SafeERC20 for IERC20;

    /// @inheritdoc IAdapter
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes memory data
    ) external returns (uint256 amountOut) {
        uint24 fee = abi.decode(data, (uint24));

        // Pull tokens from the SpotRouter (msg.sender) to this adapter
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        IPancakeV3Pool pool = PancakeV3Helper.getPool(tokenIn, tokenOut, fee);
        require(address(pool) != address(0), "Pool not found");

        // Approve the pool to take the tokens from this adapter in the callback
        IERC20(tokenIn).approve(address(pool), amountIn);

        bool zeroForOne = tokenIn < tokenOut;

        (int256 amount0, int256 amount1) = pool.swap(
            msg.sender, // recipient of the output tokens is the SpotRouter
            zeroForOne,
            int256(amountIn),
            zeroForOne
                ? 40564819207303340847894502532
                : 1461446703485210103287273052203981487000000000000,
            bytes("") // No data needed for the callback
        );

        amountOut = uint256(zeroForOne ? amount1 * -1 : amount0 * -1);
    }

    function pancakeV3PoolSwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata // data
    ) external {
        if (amount0Delta > 0) {
            IERC20(IPancakeV3Pool(msg.sender).token0()).safeTransfer(msg.sender, uint256(amount0Delta));
        }
        if (amount1Delta > 0) {
            IERC20(IPancakeV3Pool(msg.sender).token1()).safeTransfer(msg.sender, uint256(amount1Delta));
        }
    }

    /// @inheritdoc IAdapter
    function quote(address, address, uint256) public pure returns (uint256) {
        // Quoting on Pancake V3 is complex and not needed for this test
        return 0;
    }

    /// @inheritdoc IAdapter
    function getRouter() external view returns (address) {
        return msg.sender;
    }
}
