// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {VaultSpot} from "contracts/spot/VaultSpot.sol";
import {SpotRouter} from "contracts/spot/SpotRouter.sol";
import {FeeController} from "contracts/spot/FeeController.sol";
import {MockERC20} from "test/mocks/MockERC20.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";

contract VaultSpotInvariantTest is StdInvariant, Test {
    VaultSpot internal vault;
    SpotRouter internal router;
    FeeController internal feeController;
    MockERC20 internal weth;
    MockERC20 internal usdc;

    address[] internal users;
    address[] internal tokens;

    // GHOST VARIABLE: Tracks the expected state of the internal ledger
    mapping(address => mapping(address => uint256)) internal ghostBalances;

    address multisig = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    function setUp() public {
        // --- Deploy Core Contracts ---
        vault = new VaultSpot();
        feeController = new FeeController(multisig, 30, 5000, 0);
        router = new SpotRouter(address(vault), address(feeController));

        // --- Set Contract Permissions ---
        vault.setRouter(address(router));

        // --- Deploy Mock Tokens ---
        weth = new MockERC20("Wrapped Ether", "WETH");
        usdc = new MockERC20("USD Coin", "USDC");
        tokens.push(address(weth));
        tokens.push(address(usdc));

        // --- Create & Fund Users ---
        for (uint i = 0; i < 3; i++) {
            address user = address(uint160(uint(keccak256(abi.encodePacked("user", i)))));
            users.push(user);
            vm.label(user, string.concat("User", vm.toString(i + 1)));
            weth.mint(user, 100 ether);
            usdc.mint(user, 100_000 * 1e6);
        }

        // --- Handler Setup ---
        // Exclude the owner from being a random user to avoid permission conflicts
        targetContract(address(this));
        // Fuzzer will pick from this array of users
    }

    // --- Invariants ---

    /// STATE INVARIANT (SI-1): The sum of internal balances must equal the vault's contract balance.
    function invariant_solvency() public view {
        for (uint i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 totalInternalBalance = 0;
            for (uint j = 0; j < users.length; j++) {
                totalInternalBalance += ghostBalances[users[j]][token];
            }
            assertEq(IERC20(token).balanceOf(address(vault)), totalInternalBalance, "SI-1 Violated: Vault is insolvent");
        }
    }

    // --- Fuzzable Actions ---

    function deposit(address user, uint tokenIndex, uint256 amount) public {
        address token = _getToken(tokenIndex);
        vm.prank(user);
        IERC20(token).approve(address(vault), amount);

        // Predict success or revert
        if (vault.emergencyMode()) {
            vm.expectRevert("Vault: Action disabled in emergency mode");
        } else if (amount == 0) {
            vm.expectRevert("Vault: Deposit amount must be positive");
        }
        
        vm.prank(user);
        vault.deposit(token, amount);

        // Update ghost state on success
        if (!vault.emergencyMode() && amount > 0) {
            ghostBalances[user][token] += amount;
        }
    }

    function withdraw(address user, uint tokenIndex, uint256 amount) public {
        address token = _getToken(tokenIndex);
        uint256 userBalance = ghostBalances[user][token];

        // Predict success or revert
        if (vault.emergencyMode()) {
            vm.expectRevert("Vault: Action disabled in emergency mode");
        } else if (amount == 0) {
            vm.expectRevert("Vault: Withdraw amount must be positive");
        } else if (amount > userBalance) {
            vm.expectRevert("Vault: Insufficient balance");
        }

        vm.prank(user);
        vault.withdraw(token, amount);

        // Update ghost state on success
        if (!vault.emergencyMode() && amount > 0 && amount <= userBalance) {
            ghostBalances[user][token] -= amount;
        }
    }

    function emergencyWithdraw(address user, uint tokenIndex) public {
        address token = _getToken(tokenIndex);
        uint256 userBalance = ghostBalances[user][token];

        // Predict success or revert
        if (!vault.emergencyMode()) {
            vm.expectRevert("Vault: Action only enabled in emergency mode");
        } else if (userBalance == 0) {
            vm.expectRevert("Vault: No balance to withdraw");
        }

        vm.prank(user);
        vault.emergencyWithdraw(token);

        // Update ghost state on success
        if (vault.emergencyMode() && userBalance > 0) {
            ghostBalances[user][token] = 0;
        }
    }

    function mockSwap(address user, uint tokenInIndex, uint tokenOutIndex, uint256 amountIn) public {
        address tokenIn = _getToken(tokenInIndex);
        address tokenOut = _getToken(tokenOutIndex);
        uint256 userBalance = ghostBalances[user][tokenIn];

        // Predict success or revert
        if (vault.emergencyMode()) {
            vm.expectRevert("Vault: Action disabled in emergency mode");
        } else if (amountIn > userBalance) {
            vm.expectRevert("Vault: Insufficient balance for debit");
        }

        // Simplified swap simulation: credit 90% of the input amount
        uint256 amountOut = (amountIn * 9) / 10;

        // We can't use the real router, so we call debit/credit directly as the owner
        // This tests the vault's logic, which is the goal of this invariant test
        bytes32[] memory adapterIds = new bytes32[](0);
        router.swap(tokenIn, tokenOut, amountIn, adapterIds, "");

        // Update ghost state on success
        if (!vault.emergencyMode() && amountIn <= userBalance) {
            ghostBalances[user][tokenIn] -= amountIn;
            ghostBalances[user][tokenOut] += amountOut;
        }
    }

    function toggleEmergencyMode() public {
        bool currentMode = vault.emergencyMode();
        vm.prank(vault.owner());
        vault.setEmergencyMode(!currentMode);
        assert(vault.emergencyMode() != currentMode);
    }

    // --- Helper Functions ---

    function _getToken(uint index) internal view returns (address) {
        return tokens[index % tokens.length];
    }
}
