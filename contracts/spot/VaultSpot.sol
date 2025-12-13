// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Non-custodial vault for spot balances. Supports deposit/withdraw and internal credit/debit by authorized router(s).
/// @dev Use `setRouterAllowed` to authorize SpotRouter(s). For production use a timelock multisig to manage owner.
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "openzeppelin-contracts/contracts/utils/Pausable.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {SafeERC20, IERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

contract VaultSpot is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // user => token => balance
    mapping(address => mapping(address => uint256)) private balances;

    // router addresses allowed to call credit/debit
    mapping(address => bool) public routerAllowed;

    address public treasury; // protocol treasury to collect fees

    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    event Credit(address indexed router, address indexed user, address indexed token, uint256 amount);
    event Debit(address indexed router, address indexed user, address indexed token, uint256 amount);
    event RouterAllowedSet(address indexed router, bool allowed);
    event TreasurySet(address indexed treasury);

    modifier onlyRouter() {
        require(routerAllowed[msg.sender], "Vault: not router");
        _;
    }

    constructor(address initialOwner, address _treasury) Ownable(initialOwner) {
        treasury = _treasury;
    }

    // ========== USER ACTIONS ==========

    /// @notice Deposit token into vault. Caller must approve tokens to this contract.
    function deposit(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Vault: zero");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender][token] += amount;
        emit Deposit(msg.sender, token, amount);
    }

    /// @notice Withdraw tokens from vault
    function withdraw(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Vault: zero");
        uint256 bal = balances[msg.sender][token];
        require(bal >= amount, "Vault: insufficient");
        balances[msg.sender][token] = bal - amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, token, amount);
    }

    // ========== ROUTER ACTIONS ==========

    /// @notice Credit user's internal balance (callable only by SpotRouter)
    function credit(address user, address token, uint256 amount) external onlyRouter {
        require(user != address(0), "Vault: zero user");
        require(amount > 0, "Vault: zero amount");
        balances[user][token] += amount;
        emit Credit(msg.sender, user, token, amount);
    }

    /// @notice Debit user's internal balance (callable only by SpotRouter). Vault must hold tokens to transfer out when requested.
    function debit(address user, address token, uint256 amount) external onlyRouter {
        require(user != address(0), "Vault: zero user");
        require(amount > 0, "Vault: zero amount");
        uint256 bal = balances[user][token];
        require(bal >= amount, "Vault: insuf balance");
        balances[user][token] = bal - amount;
        // Transfer tokens to caller (router will send to AMM or user)
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Debit(msg.sender, user, token, amount);
    }

    /// @notice Move fee to treasury (only router can call). Router should compute fee amounts via FeeController
    function transferFeeToTreasury(address token, uint256 amount) external onlyRouter {
        require(treasury != address(0), "Vault: no treasury");
        // The router (msg.sender) has approved this contract to spend the fee amount.
        IERC20(token).safeTransferFrom(msg.sender, treasury, amount);
    }

    // ========== ADMIN ==========

    function setRouterAllowed(address router, bool allowed) external onlyOwner {
        routerAllowed[router] = allowed;
        emit RouterAllowedSet(router, allowed);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasurySet(_treasury);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ========== VIEW ==========

    function balanceOf(address user, address token) external view returns (uint256) {
        return balances[user][token];
    }
}
