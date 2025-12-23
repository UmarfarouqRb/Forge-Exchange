// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ILimitOrderRouter
 * @notice Interface for the LimitOrderRouter contract.
 * @dev Defines the structure for limit order intents and the function for their execution.
 */
interface ILimitOrderRouter {
    /**
     * @dev Represents a limit order intent signed by a user.
     *      This struct is used for EIP-712 signature verification.
     */
    struct LimitOrderIntent {
        address user;         // The user initiating the order
        address tokenIn;      // The token to be sold
        address tokenOut;     // The token to be bought
        uint256 amountIn;     // The amount of tokenIn to sell
        uint256 limitPrice;   // The target price for the trade, expressed as amountOut per amountIn
        uint256 minAmountOut; // The minimum amount of tokenOut the user is willing to accept
        uint256 deadline;     // The timestamp by which the order must be executed
        uint256 nonce;        // The user's nonce for replay protection
        address adapter;      // The address of the adapter for the DEX to be used
    }

    /**
     * @notice Executes a limit order if the conditions are met.
     * @param intent The LimitOrderIntent struct containing the order details.
     * @param signature The user's EIP-712 signature authorizing the execution.
     * @return amountOut The amount of tokenOut received from the swap.
     */
    function executeLimitOrder(
        LimitOrderIntent calldata intent,
        bytes calldata signature
    ) external returns (uint256 amountOut);
}
