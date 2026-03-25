// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {ECDSA} from "@openzeppelin-contracts/utils/cryptography/ECDSA.sol";
import {WETH} from "solmate/tokens/WETH.sol";

import {IntentSpotRouter} from "contracts/spot/IntentSpotRouter.sol";
import {VaultSpot} from "contracts/spot/VaultSpot.sol";
import {FeeController} from "contracts/spot/FeeController.sol";
import {ISpotRouter} from "contracts/spot/interfaces/ISpotRouter.sol";
import {MockAdapter} from "test/mocks/MockAdapter.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";

contract IntentSpotRouterTest is Test {
    // --- Constants -- -
    string  MAINNET_RPC_URL = "https://mainnet.base.org";
    uint256 BASE_MAINNET_FORK_BLOCK = 38_000_000;

    // --- Contracts -- -
    IntentSpotRouter internal router;
    VaultSpot internal vault;
    FeeController internal feeController;
    MockAdapter internal adapter;

    // --- Tokens -- -
    WETH internal weth = WETH(payable(0x4200000000000000000000000000000000000006));
    IERC20 internal usdc = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
    IERC20 internal dai = IERC20(0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb);

    // --- Users -- -
    address internal user;
    address internal relayer = address(0x2);
    address internal treasury = address(0x3);
    address internal lp = address(0x4); // Liquidity Provider
    uint256 internal userPrivateKey = 0x123;
    uint256 internal invalidUserPrivateKey = 0x456;

    // --- Setup -- -
    function setUp() public {
        vm.createSelectFork(MAINNET_RPC_URL, BASE_MAINNET_FORK_BLOCK);

        user = vm.addr(userPrivateKey);

        // 1. Deploy core contracts
        vault = new VaultSpot();
        feeController = new FeeController(address(this), treasury, 0, 1000); // No fees initially
        router = new IntentSpotRouter(
            payable(address(vault)),
            address(feeController),
            "IntentSpotRouter",
            "1.0"
        );

        // 2. Configure vault
        vault.setRouter(address(router));

        // 3. Deploy and configure mock adapter
        adapter = new MockAdapter();
        bytes32 adapterId = keccak256("MockAdapter");
        router.addAdapter(adapterId, address(adapter));

        // 4. Fund user and deposit into vault
        vm.deal(user, 10 ether);
        vm.startPrank(user);
        weth.deposit{value: 10 ether}();
        weth.approve(address(vault), 10 ether);
        vault.deposit(address(weth), 10 ether);
        vm.stopPrank();
    }

    // --- Test Cases -- -

    function test_executeSwap_withProtocolFee() public {
        // --- Setup -- -
        uint256 amountIn = 1 ether;
        uint256 expectedAmountOut = 2000 * 1e6; // 2000 USDC
        uint256 feeBps = 100; // 1%

        // 1. Set up the fee controller
        feeController.setBaseFeeBps(feeBps);
        feeController.setMaxFeeBps(100); // 1% max fee

        // Calculate expected fee
        (uint256 expectedProtocolFee, ) = feeController.getSpotFee(user, address(weth), address(usdc), amountIn, address(adapter));
        uint256 amountInAfterFee = amountIn - expectedProtocolFee;

        // 2. Configure the mock adapter's return value
        adapter.setAmountOut(address(weth), address(usdc), amountInAfterFee, expectedAmountOut);

        // 3. Fund the mock adapter with USDC
        deal(address(usdc), address(adapter), expectedAmountOut);

        // 4. Create and sign the swap intent
        ISpotRouter.SwapIntent memory intent = ISpotRouter.SwapIntent({
            user: user,
            tokenIn: address(weth),
            tokenOut: address(usdc),
            amountIn: amountIn,
            minAmountOut: expectedAmountOut,
            deadline: block.timestamp + 1 hours,
            nonce: 0,
            adapter: address(adapter),
            relayerFee: 0
        });

        bytes32 digest = getDigest(intent);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // --- Execution -- -
        uint256 treasuryBalanceBefore = weth.balanceOf(treasury);
        router.executeSwap(intent, signature);
        uint256 treasuryBalanceAfter = weth.balanceOf(treasury);

        // --- Assertions -- -
        assertEq(treasuryBalanceAfter - treasuryBalanceBefore, expectedProtocolFee, "Incorrect protocol fee collected");
    }

    function test_executeSwap_largeAmount_withFee() public {
        // --- Setup -- -
        uint256 amountIn = 10000 ether;
        uint256 expectedAmountOut = 20000000 * 1e6; // 20,000,000 USDC
        uint256 feeBps = 50; // 0.5%

        // 1. Set up the fee controller
        feeController.setBaseFeeBps(feeBps);
        feeController.setMaxFeeBps(100); // 1% max fee

        // Calculate expected fee
        (uint256 expectedProtocolFee, ) = feeController.getSpotFee(user, address(weth), address(usdc), amountIn, address(adapter));
        uint256 amountInAfterFee = amountIn - expectedProtocolFee;

        // 2. Fund user with additional WETH and deposit
        vm.deal(user, amountIn);
        vm.startPrank(user);
        weth.deposit{value: amountIn}();
        weth.approve(address(vault), amountIn);
        vault.deposit(address(weth), amountIn);
        vm.stopPrank();

        // 3. Configure the mock adapter
        adapter.setAmountOut(address(weth), address(usdc), amountInAfterFee, expectedAmountOut);
        deal(address(usdc), address(adapter), expectedAmountOut);

        // 4. Create and sign the swap intent
        ISpotRouter.SwapIntent memory intent = ISpotRouter.SwapIntent({
            user: user,
            tokenIn: address(weth),
            tokenOut: address(usdc),
            amountIn: amountIn,
            minAmountOut: expectedAmountOut,
            deadline: block.timestamp + 1 hours,
            nonce: 0, // Each test has its own state, so nonce starts at 0
            adapter: address(adapter),
            relayerFee: 0
        });

        bytes32 digest = getDigest(intent);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // --- Execution -- -
        uint256 treasuryBalanceBefore = weth.balanceOf(treasury);
        router.executeSwap(intent, signature);
        uint256 treasuryBalanceAfter = weth.balanceOf(treasury);

        // --- Assertions -- -
        assertEq(treasuryBalanceAfter - treasuryBalanceBefore, expectedProtocolFee, "Incorrect protocol fee collected for large amount");
    }

    function test_executeSwap_findsBestAdapter() public {
        // --- Setup -- -
        // 1. Deploy and add a second adapter
        MockAdapter adapter2 = new MockAdapter();
        bytes32 adapter2Id = keccak256("MockAdapter2");
        router.addAdapter(adapter2Id, address(adapter2));

        // 2. Define swap and quote parameters
        uint256 amountIn = 1 ether;
        uint256 goodAmountOut = 1900 * 1e6; // 1900 USDC
        uint256 bestAmountOut = 2000 * 1e6;  // 2000 USDC

        // 3. Configure mock adapters' return values
        // Note: No fees are applied in this test, so amountInAfterFee = amountIn
        adapter.setAmountOut(address(weth), address(usdc), amountIn, goodAmountOut);
        deal(address(usdc), address(adapter), goodAmountOut);

        adapter2.setAmountOut(address(weth), address(usdc), amountIn, bestAmountOut);
        deal(address(usdc), address(adapter2), bestAmountOut);

        // 4. Create and sign swap intent with adapter set to address(0)
        ISpotRouter.SwapIntent memory intent = ISpotRouter.SwapIntent({
            user: user,
            tokenIn: address(weth),
            tokenOut: address(usdc),
            amountIn: amountIn,
            minAmountOut: goodAmountOut,
            deadline: block.timestamp + 1 hours,
            nonce: 0,
            adapter: address(0),
            relayerFee: 0
        });

        bytes32 digest = getDigest(intent);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // --- Execution -- -
        vm.startPrank(relayer);
        uint256 actualAmountOut = router.executeSwap(intent, signature);
        vm.stopPrank();

        // --- Assertions -- -
        assertEq(actualAmountOut, bestAmountOut, "executeSwap did not return the best amount");
        assertEq(vault.balances(user, address(usdc)), bestAmountOut, "User did not receive the best amount out");
    }

    function test_settleTrade_successful() public {
        // --- Setup -- -
        uint256 amountIn = 1 ether;        // User wants to sell 1 WETH
        uint256 amountOut = 2000 * 1e6;  // User wants to receive 2000 USDC
        uint256 relayerFee = 0.01 ether;   // 0.01 WETH
        uint256 feeBps = 50;             // 0.5% protocol fee

        // 1. Set up the fee controller for protocol fees
        feeController.setBaseFeeBps(feeBps);

        // 2. Fund the LP with the necessary tokenOut (USDC)
        deal(address(usdc), lp, amountOut);
        vm.startPrank(lp);
        usdc.approve(address(vault), amountOut);
        vault.deposit(address(usdc), amountOut);
        vm.stopPrank();

        // 3. Create the MatchedTrade struct
        IntentSpotRouter.MatchedTrade memory trade = IntentSpotRouter.MatchedTrade({
            user: user,
            counterparty: lp,
            tokenIn: address(weth),
            tokenOut: address(usdc),
            amountIn: amountIn,
            amountOut: amountOut,
            nonce: 0,
            deadline: block.timestamp + 1 hours,
            relayerFee: relayerFee
        });

        // 4. Sign the MatchedTrade digest
        bytes32 digest = getMatchedTradeDigest(trade);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // 5. Calculate expected fees
        uint256 amountInAfterRelayerFee = amountIn - relayerFee;
        (uint256 expectedProtocolFee, ) = feeController.getSpotFee(user, address(weth), address(usdc), amountInAfterRelayerFee, address(0));
        uint256 netAmountIn = amountIn - relayerFee - expectedProtocolFee;

        // 6. Record balances before the trade
        uint256 userWethBefore = vault.balances(user, address(weth));
        uint256 userUsdcBefore = vault.balances(user, address(usdc));
        uint256 lpWethBefore = vault.balances(lp, address(weth));
        uint256 lpUsdcBefore = vault.balances(lp, address(usdc));
        uint256 relayerWethBefore = vault.balances(relayer, address(weth));
        uint256 treasuryWethBefore = vault.balances(treasury, address(weth));

        // --- Execution -- -
        vm.prank(relayer);
        vm.expectEmit(true, true, true, true);
        emit IntentSpotRouter.Swap(user, address(weth), address(usdc), amountIn, amountOut, expectedProtocolFee, relayerFee);
        router.settleTrade(trade, signature);

        // --- Assertions -- -
        // Get balances after
        uint256 userWethAfter = vault.balances(user, address(weth));
        uint256 userUsdcAfter = vault.balances(user, address(usdc));
        uint256 lpWethAfter = vault.balances(lp, address(weth));
        uint256 lpUsdcAfter = vault.balances(lp, address(usdc));
        uint256 relayerWethAfter = vault.balances(relayer, address(weth));
        uint256 treasuryWethAfter = vault.balances(treasury, address(weth));

        // 1. User balances
        assertEq(userWethBefore - userWethAfter, amountIn, "User WETH balance incorrect");
        assertEq(userUsdcAfter - userUsdcBefore, amountOut, "User USDC balance incorrect");

        // 2. LP balances
        assertEq(lpUsdcBefore - lpUsdcAfter, amountOut, "LP USDC balance incorrect");
        assertEq(lpWethAfter - lpWethBefore, netAmountIn, "LP WETH balance incorrect");

        // 3. Relayer fee
        assertEq(relayerWethAfter - relayerWethBefore, relayerFee, "Relayer fee incorrect");

        // 4. Treasury fee
        assertEq(treasuryWethAfter - treasuryWethBefore, expectedProtocolFee, "Treasury fee incorrect");
    }

    function test_settleTrade_fails_insufficientLiquidity() public {
        // --- Setup -- -
        uint256 amountIn = 1 ether;       // User wants to sell 1 WETH
        uint256 amountOut = 2000 * 1e6; // User wants to receive 2000 USDC

        // 1. Fund the LP with LESS than the required amountOut
        uint256 lpLiquidity = amountOut - (100 * 1e6); // 100 USDC less
        deal(address(usdc), lp, lpLiquidity);
        vm.startPrank(lp);
        usdc.approve(address(vault), lpLiquidity);
        vault.deposit(address(usdc), lpLiquidity);
        vm.stopPrank();

        // 2. Create the MatchedTrade struct
        IntentSpotRouter.MatchedTrade memory trade = IntentSpotRouter.MatchedTrade({
            user: user,
            counterparty: lp,
            tokenIn: address(weth),
            tokenOut: address(usdc),
            amountIn: amountIn,
            amountOut: amountOut,
            nonce: 0,
            deadline: block.timestamp + 1 hours,
            relayerFee: 0
        });

        // 3. Sign the MatchedTrade digest
        bytes32 digest = getMatchedTradeDigest(trade);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // --- Execution and Assertion -- -
        vm.prank(relayer);
        vm.expectRevert("Insufficient liquidity");
        router.settleTrade(trade, signature);
    }


    // --- Helper Functions -- -

    function getDigest(ISpotRouter.SwapIntent memory intent) internal view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            router.SWAP_INTENT_TYPEHASH(),
            intent.user,
            intent.tokenIn,
            intent.tokenOut,
            intent.amountIn,
            intent.minAmountOut,
            intent.deadline,
            intent.nonce,
            intent.adapter,
            intent.relayerFee
        ));

        bytes32 DOMAIN_SEPARATOR_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
        bytes32 nameHash = keccak256(bytes("IntentSpotRouter"));
        bytes32 versionHash = keccak256(bytes("1.0"));
        bytes32 domainSeparator = keccak256(abi.encode(
            DOMAIN_SEPARATOR_TYPEHASH,
            nameHash,
            versionHash,
            block.chainid,
            address(router)
        ));

        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function getMatchedTradeDigest(IntentSpotRouter.MatchedTrade memory trade) internal view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            router.MATCHED_TRADE_TYPEHASH(),
            trade.user,
            trade.counterparty,
            trade.tokenIn,
            trade.tokenOut,
            trade.amountIn,
            trade.amountOut,
            trade.nonce,
            trade.deadline,
            trade.relayerFee
        ));

        bytes32 DOMAIN_SEPARATOR_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
        bytes32 nameHash = keccak256(bytes("IntentSpotRouter"));
        bytes32 versionHash = keccak256(bytes("1.0"));
        bytes32 domainSeparator = keccak256(abi.encode(
            DOMAIN_SEPARATOR_TYPEHASH,
            nameHash,
            versionHash,
            block.chainid,
            address(router)
        ));

        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }
}
