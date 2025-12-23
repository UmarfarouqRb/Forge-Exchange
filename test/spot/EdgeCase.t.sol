// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {VaultSpot} from "../../contracts/spot/VaultSpot.sol";
import {SpotRouter} from "../../contracts/spot/SpotRouter.sol";
import {FeeController} from "../../contracts/spot/FeeController.sol";
import {AerodromeAdapter} from "../../contracts/spot/adapters/AerodromeAdapter.sol";
import {PancakeV3Adapter} from "../../contracts/spot/adapters/PancakeV3Adapter.sol";
import {IAdapter} from "../../contracts/spot/interfaces/IAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract EdgeCaseTest is Test {
    // --- Constants -- -
    // Core
    address internal constant MULTISIG = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address internal constant USER = 0x420000000000000000000000000000000000000A;

    // Tokens
    address internal constant cbBTC = 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf;
    address internal constant WETH = 0x4200000000000000000000000000000000000006;
    address internal constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // 6 decimals
    address internal constant AERO = 0x940181a94A35A4569E4529A3CDfB74e38FD98631; // 18 decimals
    address internal constant TRUMP = 0xc27468b12ffA6d714B1b5fBC87eF403F38b82AD4; // 18 decimals
    address internal constant SOL = 0x311935Cd80B76769bF2ecC9D8Ab7635b2139cf82; // 9 decimals
    address internal constant DAI = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb; // 18 decimals

    // Amounts
    uint256 internal constant CB_BTC_AMOUNT = 1 * 10 ** 8; // 1 cbBTC
    uint256 internal constant USDC_DEPOSIT_AMOUNT = 2000 * 10 ** 6; // 2000 USDC

    // --- State ---
    VaultSpot internal vault;
    SpotRouter internal router;
    FeeController internal feeController;
    AerodromeAdapter internal aerodromeAdapter;
    PancakeV3Adapter internal pancakeAdapter;

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("base"));

        // Deploy core contracts with MULTISIG as owner
        vm.prank(MULTISIG);
        vault = new VaultSpot();

        vm.prank(MULTISIG);
        feeController = new FeeController(MULTISIG, MULTISIG, 100, 1000); // 1% fee, 10% relayer fee

        router = new SpotRouter(address(vault), address(feeController));

        // Grant router permission in vault
        vm.prank(MULTISIG);
        vault.setRouter(address(router));

        // Deploy and add adapters
        aerodromeAdapter = new AerodromeAdapter();
        pancakeAdapter = new PancakeV3Adapter();
        router.addAdapter(keccak256("aerodrome"), address(aerodromeAdapter));
        router.addAdapter(keccak256("pancake-v3"), address(pancakeAdapter));

        // --- Fund user and deposit into vault ---
        // 1. cbBTC for the original test
        deal(cbBTC, USER, CB_BTC_AMOUNT);
        vm.startPrank(USER);
        IERC20(cbBTC).approve(address(vault), CB_BTC_AMOUNT);
        vault.deposit(cbBTC, CB_BTC_AMOUNT);
        vm.stopPrank();

        // 2. USDC for the new multi-amount tests
        deal(USDC, USER, USDC_DEPOSIT_AMOUNT);
        vm.startPrank(USER);
        IERC20(USDC).approve(address(vault), USDC_DEPOSIT_AMOUNT);
        vault.deposit(USDC, USDC_DEPOSIT_AMOUNT);
        vm.stopPrank();
    }

    function test_CBBTC_to_WETH_Swap() public {
        uint256 amountIn = CB_BTC_AMOUNT;

        uint256 userWETHBalanceBefore = vault.balances(USER, WETH);
        uint256 feeBalanceBefore = IERC20(cbBTC).balanceOf(MULTISIG);

        bytes32[] memory adapters = new bytes32[](1);
        adapters[0] = keccak256("aerodrome");
        bytes memory swapData = abi.encode(false); // isStablePool = false

        vm.startPrank(USER);
        uint256 amountOut = router.swap(cbBTC, WETH, amountIn, adapters, swapData);
        vm.stopPrank();

        uint256 userWETHBalanceAfter = vault.balances(USER, WETH);
        uint256 feeBalanceAfter = IERC20(cbBTC).balanceOf(MULTISIG);

        uint256 userAmountReceived = userWETHBalanceAfter - userWETHBalanceBefore;
        uint256 feeCollected = feeBalanceAfter - feeBalanceBefore;

        console.log("--- cbBTC to WETH Swap ---");
        console.log("Amount In: 1 cbBTC");
        console.log("Total Amount Out (WETH):", amountOut / 1e18);
        console.log("Amount to User (WETH):", userAmountReceived / 1e18);
        console.log("Fee Collected (cbBTC):", feeCollected / 1e8); // cbBTC has 8 decimals
        console.log("--------------------------");

        assertEq(vault.balances(USER, cbBTC), 0, "User cbBTC balance should be zero");
        assertTrue(userAmountReceived > 0, "User should have received WETH");
        assertTrue(feeCollected > 0, "Protocol fee should have been collected");
    }

    function _performAndLogSwap(
        address tokenIn,
        uint8 inDecimals,
        address tokenOut,
        uint8 outDecimals,
        uint256 amountIn,
        bytes32[] memory adapters,
        bytes memory swapData,
        string memory logHeader
    ) private {
        uint256 userBalanceBefore = vault.balances(USER, tokenOut);
        uint256 feeBalanceBefore = IERC20(tokenIn).balanceOf(MULTISIG);

        vm.startPrank(USER);
        router.swap(tokenIn, tokenOut, amountIn, adapters, swapData);
        vm.stopPrank();

        uint256 userBalanceAfter = vault.balances(USER, tokenOut);
        uint256 feeBalanceAfter = IERC20(tokenIn).balanceOf(MULTISIG);

        uint256 userAmountReceived = userBalanceAfter - userBalanceBefore;
        uint256 feeCollected = feeBalanceAfter - feeBalanceBefore;

        console.log(logHeader);
        console.log("Amount to User:", userAmountReceived / (10 ** outDecimals));
        console.log("Fee Collected:", feeCollected / (10 ** inDecimals));

        assertTrue(userAmountReceived > 0, "User did not receive tokens");
        assertTrue(feeCollected > 0, "Fee was not collected");
    }

    function test_USDC_to_AERO_Swaps() public {
        uint256[] memory amounts = new uint256[](4);
        amounts[0] = 5 * 10 ** 6;
        amounts[1] = 10 * 10 ** 6;
        amounts[2] = 100 * 10 ** 6;
        amounts[3] = 150 * 10 ** 6;

        bytes32[] memory ad = new bytes32[](1);
        ad[0] = keccak256("aerodrome");
        bytes memory swapData = abi.encode(false); // isStablePool = false

        console.log("--- Swapping USDC to AERO (Aerodrome) ---");
        for (uint i = 0; i < amounts.length; i++) {
            string memory header = string(abi.encodePacked("Swap for ", vm.toString(amounts[i] / 10 ** 6), " USDC:"));
            _performAndLogSwap(USDC, 6, AERO, 18, amounts[i], ad, swapData, header);
        }
        console.log("-----------------------------------------");
    }

    function test_USDC_to_DAI_Swaps() public {
        uint256[] memory amounts = new uint256[](4);
        amounts[0] = 5 * 10 ** 6;
        amounts[1] = 10 * 10 ** 6;
        amounts[2] = 100 * 10 ** 6;
        amounts[3] = 150 * 10 ** 6;

        bytes32[] memory ad = new bytes32[](1);
        ad[0] = keccak256("aerodrome");
        bytes memory swapData = abi.encode(true); // isStablePool = true

        console.log("--- Swapping USDC to DAI (Aerodrome Stable) ---");
        for (uint i = 0; i < amounts.length; i++) {
            string memory header = string(abi.encodePacked("Swap for ", vm.toString(amounts[i] / 10 ** 6), " USDC:"));
            _performAndLogSwap(USDC, 6, DAI, 18, amounts[i], ad, swapData, header);
        }
        console.log("-----------------------------------------------");
    }

    function test_USDC_to_TRUMP_Swaps() public {
        uint256[] memory amounts = new uint256[](4);
        amounts[0] = 5 * 10 ** 6;
        amounts[1] = 10 * 10 ** 6;
        amounts[2] = 100 * 10 ** 6;
        amounts[3] = 150 * 10 ** 6;

        bytes32[] memory multi = new bytes32[](2);
        multi[0] = keccak256("aerodrome");
        multi[1] = keccak256("pancake-v3");
        // isStablePool for Aerodrome, PancakeV3 adapter will ignore
        bytes memory swapData = abi.encode(false);

        console.log("--- Swapping USDC to TRUMP (Multi-DEX) ---");
        for (uint i = 0; i < amounts.length; i++) {
            string memory header = string(abi.encodePacked("Swap for ", vm.toString(amounts[i] / 10 ** 6), " USDC:"));
            _performAndLogSwap(USDC, 6, TRUMP, 18, amounts[i], multi, swapData, header);
        }
        console.log("------------------------------------------");
    }

    function test_USDC_to_SOL_Swaps() public {
        uint256[] memory amounts = new uint256[](4);
        amounts[0] = 5 * 10 ** 6;
        amounts[1] = 10 * 10 ** 6;
        amounts[2] = 100 * 10 ** 6;
        amounts[3] = 150 * 10 ** 6;

        bytes32[] memory multi = new bytes32[](2);
        multi[0] = keccak256("aerodrome");
        multi[1] = keccak256("pancake-v3");
        // isStablePool for Aerodrome, PancakeV3 adapter will ignore
        bytes memory swapData = abi.encode(false);

        console.log("--- Swapping USDC to SOL (Multi-DEX) ---");
        for (uint i = 0; i < amounts.length; i++) {
            string memory header = string(abi.encodePacked("Swap for ", vm.toString(amounts[i] / 10 ** 6), " USDC:"));
            _performAndLogSwap(USDC, 6, SOL, 9, amounts[i], multi, swapData, header);
        }
        console.log("----------------------------------------");
    }
}