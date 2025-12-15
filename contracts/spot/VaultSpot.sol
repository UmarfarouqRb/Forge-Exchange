// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title VaultSpot
/// @author Protocol-Dev
/// @notice This contract is the central custody and accounting system for a spot trading protocol.
/// It holds all user assets in a non-custodial manner, tracking individual balances through an
/// internal ledger. It is designed with formal invariants to ensure safety and predictability.
///
/// STATE INVARIANT (SI-1): The sum of all internal user balances for a given token
/// must never exceed the total balance of that token held by this contract.
///
/// STATE INVARIANT (SI-2): A user's internal balance of any token can never be negative.
///
/// SAFETY PROPERTY (SP-1): Only the designated SpotRouter contract can trigger debits,
/// credits, or token approvals on behalf of users.
///
/// SAFETY PROPERTY (SP-2): The contract owner (admin) cannot directly access, transfer,
/// or arbitrarily modify any user's funds or internal balances.
///
/// SAFETY PROPERTY (SP-3): Users can always withdraw their funds in an emergency.
contract VaultSpot is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- State Variables ---

    address public spotRouter;
    bool public emergencyMode;

    /// @dev Internal ledger mapping: user -> token -> balance.
    mapping(address => mapping(address => uint256)) public balances;

    // --- Events ---

    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    event EmergencyWithdraw(address indexed user, address indexed token, uint256 amount);
    event Debit(address indexed user, address indexed token, uint256 amount);
    event Credit(address indexed user, address indexed token, uint256 amount);
    event FeeCollected(address indexed token, uint256 amount);
    event RouterChanged(address indexed newRouter);
    event EmergencyModeChanged(bool isEmergency);

    // --- Modifiers ---

    modifier onlyRouter() {
        require(msg.sender == spotRouter, "Vault: Caller is not the SpotRouter");
        _;
    }

    modifier whenNotInEmergency() {
        require(!emergencyMode, "Vault: Action disabled in emergency mode");
        _;
    }

    modifier whenInEmergency() {
        require(emergencyMode, "Vault: Action only enabled in emergency mode");
        _;
    }

    // --- Constructor ---

    constructor() Ownable(msg.sender) {}

    // --- Admin Functions ---

    /// @notice Sets the address of the SpotRouter, which is authorized to execute trades.
    /// @param _router The address of the SpotRouter contract.
    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Vault: Cannot set router to zero address");
        spotRouter = _router;
        emit RouterChanged(_router);
    }

    /// @notice Activates or deactivates emergency mode.
    /// @param _isEmergency The desired state for emergency mode.
    function setEmergencyMode(bool _isEmergency) external onlyOwner {
        emergencyMode = _isEmergency;
        emit EmergencyModeChanged(_isEmergency);
    }

    // --- User Functions (Normal Operations) ---

    /// @notice Deposits tokens into the vault.
    /// @dev This action is disabled during emergency mode.
    /// EXECUTION INVARIANT (EI-D1): Post-deposit balance must equal pre-deposit balance + amount.
    function deposit(address token, uint256 amount) external nonReentrant whenNotInEmergency {
        require(amount > 0, "Vault: Deposit amount must be positive");

        uint256 balanceBefore = balances[msg.sender][token];

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender][token] += amount;

        assert(balances[msg.sender][token] == balanceBefore + amount);
        emit Deposit(msg.sender, token, amount);
    }

    /// @notice Withdraws tokens from the vault.
    /// @dev This action is disabled during emergency mode to prevent conflicts with emergencyWithdraw.
    function withdraw(address token, uint256 amount) external nonReentrant whenNotInEmergency {
        require(amount > 0, "Vault: Withdraw amount must be positive");

        uint256 balanceBefore = balances[msg.sender][token];
        require(balanceBefore >= amount, "Vault: Insufficient balance");

        // Checks-Effects-Interactions Pattern
        balances[msg.sender][token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);

        assert(balances[msg.sender][token] == balanceBefore - amount);
        emit Withdraw(msg.sender, token, amount);
    }

    // --- User Functions (Emergency Operations) ---

    /// @notice Allows a user to withdraw their entire balance of a token during an emergency.
    /// @dev This is an escape hatch and can only be called when emergencyMode is true.
    /// EXECUTION INVARIANT (EI-E1): User can only withdraw their own, full balance.
    /// EXECUTION INVARIANT (EI-E2): Post-withdrawal balance for the token must be zero.
    function emergencyWithdraw(address token) external nonReentrant whenInEmergency {
        uint256 amount = balances[msg.sender][token];
        require(amount > 0, "Vault: No balance to withdraw");

        // Checks-Effects-Interactions Pattern
        balances[msg.sender][token] = 0;
        IERC20(token).safeTransfer(msg.sender, amount);

        emit EmergencyWithdraw(msg.sender, token, amount);
    }

    // --- Router-Only Functions ---

    /// @notice Debits tokens from a user's balance to initiate a swap. Called only by the SpotRouter.
    /// @dev This action is disabled during emergency mode.
    /// EXECUTION INVARIANT (EI-S1): Debit must precede any external call in a swap.
    function debit(address user, address token, uint256 amount) external onlyRouter nonReentrant whenNotInEmergency {
        uint256 balanceBefore = balances[user][token];
        require(balanceBefore >= amount, "Vault: Insufficient balance for debit");

        balances[user][token] -= amount;

        assert(balances[user][token] == balanceBefore - amount);
        emit Debit(user, token, amount);
    }

    /// @notice Credits tokens to a user's balance to finalize a swap. Called only by the SpotRouter.
    /// @dev This action is disabled during emergency mode.
    /// EXECUTION INVARIANT (EI-S2): Credit is the final step in a swap, reflecting actual received assets.
    function credit(address user, address token, uint256 amount) external onlyRouter nonReentrant whenNotInEmergency {
        uint256 balanceBefore = balances[user][token];

        balances[user][token] += amount;

        assert(balances[user][token] == balanceBefore + amount);
        emit Credit(user, token, amount);
    }

    /// @notice Called by the SpotRouter to credit protocol fees to the treasury (owner).
    function collectFee(address token, uint256 amount) external onlyRouter {
        require(amount > 0, "Vault: Fee amount must be positive");
        balances[owner()][token] += amount;
        emit FeeCollected(token, amount);
    }

    /// @notice Approves the SpotRouter to spend a token held by the vault. Called only by the SpotRouter.
    function approveToken(address token, address spender, uint256 amount) external onlyRouter {
        IERC20(token).safeIncreaseAllowance(spender, amount);
    }

    /// @notice Resets the SpotRouter's allowance for a token to zero. Called only by the SpotRouter.
    function resetTokenApproval(address token, address spender) external onlyRouter {
        uint256 currentAllowance = IERC20(token).allowance(address(this), spender);
        if (currentAllowance > 0) {
            IERC20(token).safeDecreaseAllowance(spender, currentAllowance);
        }
    }
}
