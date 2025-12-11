// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {VaultSpot} from "./VaultSpot.sol";
import {FeeController} from "./FeeController.sol";
import {AMMAggregator} from "./AMMAggregator.sol";

/// @title SpotRouter
/// @notice Main entrypoint for user swaps. Integrates Vault, Fees, and AMM Aggregation.
/// @dev Handles token movement, fee calculation, and orchestrates the swap execution.
contract SpotRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    VaultSpot public vault;
    FeeController public feeController;
    AMMAggregator public aggregator;

    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        string usedAdapter
    );

    /// @param _multisig The address for Ownable pattern (e.g., a Gnosis Safe).
    /// @param _vault The address of the deployed VaultSpot contract.
    /// @param _feeController The address of the deployed FeeController contract.
    /// @param _aggregator The address of the deployed AMMAggregator contract.
    constructor(
        address _multisig,
        address _vault,
        address _feeController,
        address _aggregator
    ) Ownable(_multisig) {
        vault = VaultSpot(_vault);
        feeController = FeeController(_feeController);
        aggregator = AMMAggregator(_aggregator);
    }

    /// @notice Executes a swap using the best available route found by the AMMAggregator.
    /// @dev This is the primary function for users to interact with the swap functionality.
    ///      It debits tokens from the user's vault balance, calculates and deducts fees,
    ///      executes the swap, and credits the output tokens back to the user's vault balance.
    /// @param tokenIn The address of the token to be swapped.
    /// @param tokenOut The address of the token to be received.
    /// @param amountIn The amount of `tokenIn` to be swapped.
    /// @param minAmountOut The minimum amount of `tokenOut` expected to be received.
    /// @param data Additional data to be passed to the adapter (if any).
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata data
    ) external nonReentrant {
        // 1. Debit the user's vault balance for the input token.
        // This transfers the tokens from the vault to this router contract.
        vault.debit(msg.sender, tokenIn, amountIn);

        // 2. Calculate fees.
        (uint256 amountAfterFee, uint256 protocolAmount, ) = feeController.calculateFees(
            tokenIn,
            tokenOut,
            amountIn
        );

        // 3. Transfer protocol fee to the vault's treasury.
        if (protocolAmount > 0) {
            IERC20(tokenIn).safeIncreaseAllowance(address(vault), protocolAmount);
            vault.transferFeeToTreasury(tokenIn, protocolAmount);
            IERC20(tokenIn).safeDecreaseAllowance(address(vault), protocolAmount);
        }

        // 4. Approve the aggregator to spend the remaining tokens.
        IERC20(tokenIn).safeIncreaseAllowance(address(aggregator), amountAfterFee);

        // 5. Execute the swap via the aggregator.
        (uint256 amountOut, string memory usedAdapter) = aggregator.swapBest(
            tokenIn,
            tokenOut,
            amountAfterFee,
            minAmountOut,
            data
        );

        IERC20(tokenIn).safeDecreaseAllowance(address(aggregator), amountAfterFee);

        // 6. Credit the user's vault balance with the output token.
        // The aggregator will have sent the output tokens to this router contract.
        IERC20(tokenOut).safeIncreaseAllowance(address(vault), amountOut);
        vault.credit(msg.sender, tokenOut, amountOut);
        IERC20(tokenOut).safeDecreaseAllowance(address(vault), amountOut);

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, usedAdapter);
    }

     function sweepERC20(address _token) external onlyOwner {
        if (_token == address(0)) {
            payable(owner()).transfer(address(this).balance);
            return;
        }
        IERC20(_token).safeTransfer(owner(), IERC20(_token).balanceOf(address(this)));
    }

    receive() external payable {}
}
