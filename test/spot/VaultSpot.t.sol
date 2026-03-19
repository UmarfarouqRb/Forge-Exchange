// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {WETH} from "solmate/tokens/WETH.sol";
import {VaultSpot} from "contracts/spot/VaultSpot.sol";

contract VaultSpotTest is Test {
    // --- Contracts -- -
    VaultSpot internal vault;
    WETH internal weth;

    // --- Users -- -
    address internal user = address(0x1);
    address internal owner = address(0x2);

    // --- Setup -- -
    function setUp() public {
        vm.startPrank(owner);
        vault = new VaultSpot();
        weth = new WETH();
        vault.setWETH(address(weth));
        vm.stopPrank();

        vm.deal(user, 10 ether);
    }

    // --- Test Cases -- -

    function test_withdrawETH() public {
        // --- Deposit -- -
        vm.startPrank(user);
        vault.depositETH{value: 10 ether}();
        vm.stopPrank();

        // --- Withdraw -- -
        uint256 withdrawAmount = 5 ether;
        uint256 fee = (withdrawAmount * vault.WITHDRAW_FEE_BPS()) / vault.BPS_DENOMINATOR();
        uint256 netAmount = withdrawAmount - fee;

        uint256 userBalanceBefore = user.balance;
        uint256 ownerBalanceBefore = owner.balance;

        vm.startPrank(user);
        vault.withdrawETH(withdrawAmount);
        vm.stopPrank();

        // --- Assertions -- -
        assertEq(user.balance, userBalanceBefore + netAmount, "User did not receive the correct amount of ETH");
        assertEq(owner.balance, ownerBalanceBefore + fee, "Owner did not receive the correct fee");
    }
}
