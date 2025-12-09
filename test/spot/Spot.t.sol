// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// DUTs (Contracts Under Test)
import {VaultSpot} from "../../contracts/spot/VaultSpot.sol";
import {FeeController} from "../../contracts/spot/FeeController.sol";
import {AMMAggregator} from "../../contracts/spot/AMMAggregator.sol";
import {SpotRouter} from "../../contracts/spot/SpotRouter.sol";
import {UniswapV2Adapter} from "../../contracts/spot/adapters/UniswapV2Adapter.sol";
import {PancakeV3Adapter} from "../../contracts/spot/adapters/PancakeV3Adapter.sol";
import {UniswapV3Adapter} from "../../contracts/spot/adapters/UniswapV3Adapter.sol";

contract SpotIntegrationTest is Test {
    // Base Mainnet Addresses
    address internal constant WETH = 0x4200000000000000000000000000000000000006;
    address internal constant USDBC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // USDbC, not USDC

    // Base DEX Addresses
    // Note: Using SushiSwap on Base as the Uniswap V2 compatible router
    address internal constant SUSHI_V2_ROUTER = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
    // Note: Uniswap doesn't have a V3 router on Base, so we use PancakeSwap's instead
    // for the UniswapV3Adapter to demonstrate V3 compatibility.
    address internal constant UNI_V3_ROUTER = 0x1b81D678ffb9C0263b24A97847620C99d213eB14;
    address internal constant UNI_V3_QUOTER = 0x03aDddB23502693F9c31202a0e4A446f5A423368;
    address internal constant PANCAKE_V3_ROUTER = 0x1b81D678ffb9C0263b24A97847620C99d213eB14;
    address internal constant PANCAKE_V3_QUOTER = 0x03aDddB23502693F9c31202a0e4A446f5A423368;

    // Test user & treasury
    address internal constant USER = 0x1a1A1A1A1a1A1A1a1A1a1a1a1a1a1a1A1A1a1a1a;
    address internal constant TREASURY = 0xBeA5000000000000000000000000000000000000;

    // Contracts
    VaultSpot internal vault;
    FeeController internal feeController;
    AMMAggregator internal aggregator;
    SpotRouter internal router;
    UniswapV2Adapter internal sushiV2Adapter;
    UniswapV3Adapter internal uniV3Adapter;
    PancakeV3Adapter internal pancakeV3Adapter;

    function setUp() public {
        // --- Deploy Contracts ---
        vm.startPrank(USER);
        vault = new VaultSpot(USER, TREASURY);
        feeController = new FeeController(USER, 10, 50, 5); // 10bps swap, 50% to proto, 5% to relayer
        aggregator = new AMMAggregator(USER);
        router = new SpotRouter(USER, address(vault), address(feeController), address(aggregator));

        // --- Deploy & Register Adapters ---
        sushiV2Adapter = new UniswapV2Adapter(SUSHI_V2_ROUTER); // V2-compatible
        uniV3Adapter = new UniswapV3Adapter(UNI_V3_QUOTER, UNI_V3_ROUTER);
        pancakeV3Adapter = new PancakeV3Adapter(PANCAKE_V3_QUOTER, PANCAKE_V3_ROUTER);

        aggregator.registerAdapter(bytes32('SushiV2'), address(sushiV2Adapter));
        aggregator.registerAdapter(bytes32('UniswapV3'), address(uniV3Adapter));
        aggregator.registerAdapter(bytes32('PancakeV3'), address(pancakeV3Adapter));

        // --- Configure V3 Adapters ---
        uniV3Adapter.setFee(WETH, USDBC, 500);
        pancakeV3Adapter.setFee(WETH, USDBC, 500);

        // --- Authorize Router in Vault ---
        vault.setRouterAllowed(address(router), true);
        vm.stopPrank();

        // --- Fund User ---
        deal(WETH, USER, 100 ether); // Give user 100 WETH
    }

    /// @notice Test end-to-end swap from WETH to USDbC using the aggregator
    function test_Full_Swap() public {
        uint256 amountIn = 1 ether;

        // --- Arrange ---
        vm.startPrank(USER);
        IERC20(WETH).approve(address(vault), amountIn);
        vault.deposit(WETH, amountIn);
        assertEq(vault.balanceOf(USER, WETH), amountIn, "Vault deposit failed");

        // --- Act ---
        // Swap via SpotRouter. AMMAggregator will find the best rate across all registered adapters.
        router.swap(WETH, USDBC, amountIn, 1, "");
        vm.stopPrank();

        // --- Assert ---
        uint256 userWethBalance = vault.balanceOf(USER, WETH);
        uint256 userUsdbcBalance = vault.balanceOf(USER, USDBC);
        FeeController.FeeConfig memory feeConfig = feeController.getFeeConfig(WETH, USDBC);
        uint256 feeAmount = (amountIn * feeConfig.swapFeeBps) / 10_000;
        uint256 treasuryBalance = IERC20(WETH).balanceOf(TREASURY);

        assertEq(userWethBalance, 0, "User WETH balance should be 0");
        assertTrue(userUsdbcBalance > 0, "User should have received USDbC");
        assertEq(treasuryBalance, feeAmount, "Treasury should have received the fee");
    }

    /// @notice Test end-to-end swap with a custom fee tier
    function test_Full_Swap_With_Custom_Fee() public {
        uint256 amountIn = 1 ether;
        uint24 customFeeBps = 100; // 1%

        // --- Arrange ---
        vm.startPrank(USER);
        // Set a custom fee for the WETH/USDBC pair
        (, uint24 defaultProtocolShareBps, uint24 defaultRelayerShareBps) = feeController.defaultFee();
        feeController.setPairFee(WETH, USDBC, customFeeBps, defaultProtocolShareBps, defaultRelayerShareBps);
        FeeController.FeeConfig memory newFee = feeController.getFeeConfig(WETH, USDBC);
        assertEq(newFee.swapFeeBps, customFeeBps, "Custom fee not set");

        IERC20(WETH).approve(address(vault), amountIn);
        vault.deposit(WETH, amountIn);

        // --- Act ---
        router.swap(WETH, USDBC, amountIn, 1, "");
        vm.stopPrank();

        // --- Assert ---
        uint256 expectedFeeAmount = (amountIn * customFeeBps) / 10_000;
        uint256 treasuryBalance = IERC20(WETH).balanceOf(TREASURY);

        assertEq(treasuryBalance, expectedFeeAmount, "Treasury should have received the custom fee");
    }

    /// @notice Test basic deposit and withdraw functionality of the Vault
    function test_Vault_Deposit_And_Withdraw() public {
        uint256 amount = 5 ether;
        vm.startPrank(USER);

        // --- Deposit ---
        IERC20(WETH).approve(address(vault), amount);
        vault.deposit(WETH, amount);
        assertEq(vault.balanceOf(USER, WETH), amount, "Deposit amount is incorrect");
        assertEq(IERC20(WETH).balanceOf(USER), 100 ether - amount, "User WETH balance post-deposit is wrong");

        // --- Withdraw ---
        vault.withdraw(WETH, amount);
        assertEq(vault.balanceOf(USER, WETH), 0, "Withdrawal did not zero out vault balance");
        assertEq(IERC20(WETH).balanceOf(USER), 100 ether, "User WETH balance post-withdrawal is wrong");

        vm.stopPrank();
    }
}
