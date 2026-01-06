// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ISpotRouter
 * @notice Interface for the SpotRouter, defining the core structures for swaps.
 */
interface ISpotRouter {
    /**
     * @dev Represents a user's intent to perform a swap.
     * This struct is used for EIP-712 signing.
     */
    struct SwapIntent {
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 deadline;
        uint256 nonce;
        address adapter; // The single, pre-determined adapter for execution
        uint256 relayerFee; // The fee paid to the relayer for executing the intent
    }

    /**
     * @notice Executes a swap based on a signed user intent.
     * @param intent The SwapIntent struct containing the swap details.
     * @param signature The user's EIP-712 signature.
     * @return amountOut The amount of tokenOut received from the swap.
     */
    function executeSwap(
        SwapIntent calldata intent,
        bytes calldata signature
    ) external returns (uint256 amountOut);
}
