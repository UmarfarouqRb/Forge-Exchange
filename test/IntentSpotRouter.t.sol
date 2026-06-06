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
    // --- Constants ---
    string  MAINNET_RPC_URL = "https://mainnet.base.org";
    uint256 BASE_MAINNET_FORK_BLOCK = 38_000_000;

    // --- Contracts ---
    IntentSpotRouter internal router;
    VaultSpot internal vault;
    FeeController internal feeController;
    MockAdapter internal adapter;

    // --- Tokens ---
    WETH internal weth = WETH(payable(0x4200000000000000000000000000000000000006));
    IERC20 internal usdc = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
    IERC20 internal dai = IERC20(0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb);

    // --- Users ---
    address internal user;
    address internal relayer = address(0x2);
    address internal treasury = address(0x3);
    address internal lp = address(0x4); // Liquidity Provider
    address internal sessionKeyAddress = address(0x5);
    uint256 internal userPrivateKey = 0x123;
    uint256 internal invalidUserPrivateKey = 0x456;

    // --- Setup ---
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

        // [FIX #6] Authorize relayer BEFORE tests run
        router.authorizeRelayer(relayer);

        // 4. Fund user and deposit into vault
        vm.deal(user, 10 ether);
        vm.startPrank(user);
        weth.deposit{value: 10 ether}();
        weth.approve(address(vault), 10 ether);
        vault.deposit(address(weth), 10 ether);
        vm.stopPrank();
    }

    // --- Test Cases ---

    // [FIX #6] Test: Relayer Authorization Check
    function test_executeSwap_relayerNotAuthorized() public {
        uint256 amountIn = 1 ether;
        uint256 expectedAmountOut = 2000 * 1e6;

        adapter.setAmountOut(address(weth), address(usdc), amountIn, expectedAmountOut);
        deal(address(usdc), address(adapter), expectedAmountOut);

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

        // Try to execute with unauthorized relayer
        address unauthorizedRelayer = address(0x999);
        vm.prank(unauthorizedRelayer);
        vm.expectRevert("Unauthorized relayer");
        router.executeSwap(intent, signature);
    }

    // [FIX #5] Test: Zero Amount Validation
    function test_executeSwap_zeroAmountIn() public {
        ISpotRouter.SwapIntent memory intent = ISpotRouter.SwapIntent({
            user: user,
            tokenIn: address(weth),
            tokenOut: address(usdc),
            amountIn: 0, // ZERO AMOUNT
            minAmountOut: 0,
            deadline: block.timestamp + 1 hours,
            nonce: 0,
            adapter: address(adapter),
            relayerFee: 0
        });

        bytes32 digest = getDigest(intent);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(relayer);
        vm.expectRevert("Input amount cannot be zero");
        router.executeSwap(intent, signature);
    }

    // [FIX #1] Test: Nonce Not Consumed on Invalid Signature
    function test_executeSwap_invalidSignature_nonceNotConsumed() public {
        ISpotRouter.SwapIntent memory intent = ISpotRouter.SwapIntent({
            user: user,
            tokenIn: address(weth),
            tokenOut: address(usdc),
            amountIn: 1 ether,
            minAmountOut: 2000 * 1e6,
            deadline: block.timestamp + 1 hours,
            nonce: 0,
            adapter: address(adapter),
            relayerFee: 0
        });

        // Create INVALID signature
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0x999, keccak256("invalid"));
        bytes memory invalidSignature = abi.encodePacked(r, s, v);

        // This should revert due to invalid signature
        vm.prank(relayer);
        vm.expectRevert("SpotRouter: Invalid signature or session key");
        router.executeSwap(intent, invalidSignature);

        // Verify nonce was NOT consumed (still 0)
        assertEq(router.nonces(user), 0, "FAIL: Nonce was consumed despite invalid signature!");
    }

    function test_executeSwap_withProtocolFee() public {
        // --- Setup ---
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

        // --- Execution ---
        uint256 treasuryBalanceBefore = weth.balanceOf(treasury);
        vm.prank(relayer);
        router.executeSwap(intent, signature);
        uint256 treasuryBalanceAfter = weth.balanceOf(treasury);

        // --- Assertions ---
        assertEq(treasuryBalanceAfter - treasuryBalanceBefore, expectedProtocolFee, "Incorrect protocol fee collected");
    }

    function test_executeSwap_largeAmount_withFee() public {
        // --- Setup ---
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
            nonce: 0,
            adapter: address(adapter),
            relayerFee: 0
        });

        bytes32 digest = getDigest(intent);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // --- Execution ---
        uint256 treasuryBalanceBefore = weth.balanceOf(treasury);
        vm.prank(relayer);
        router.executeSwap(intent, signature);
        uint256 treasuryBalanceAfter = weth.balanceOf(treasury);

        // --- Assertions ---
        assertEq(treasuryBalanceAfter - treasuryBalanceBefore, expectedProtocolFee, "Incorrect protocol fee collected for large amount");
    }

    function test_executeSwap_findsBestAdapter() public {
        // --- Setup ---
        // 1. Deploy and add a second adapter
        MockAdapter adapter2 = new MockAdapter();
        bytes32 adapter2Id = keccak256("MockAdapter2");
        router.addAdapter(adapter2Id, address(adapter2));

        // 2. Define swap and quote parameters
        uint256 amountIn = 1 ether;
        uint256 goodAmountOut = 1900 * 1e6; // 1900 USDC
        uint256 bestAmountOut = 2000 * 1e6;  // 2000 USDC

        // 3. Configure mock adapters' return values
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

        // --- Execution ---
        vm.prank(relayer);
        uint256 actualAmountOut = router.executeSwap(intent, signature);

        // --- Assertions ---
        assertEq(actualAmountOut, bestAmountOut, "executeSwap did not return the best amount");
        assertEq(vault.balances(user, address(usdc)), bestAmountOut, "User did not receive the best amount out");
    }

    // [FIX #7] Test: Public Swap with minAmountOut parameter
    function test_swap_withMinAmountOut() public {
        uint256 amountIn = 1 ether;
        uint256 expectedAmountOut = 2000 * 1e6;

        adapter.setAmountOut(address(weth), address(usdc), amountIn, expectedAmountOut);
        deal(address(usdc), address(adapter), expectedAmountOut);

        bytes32[] memory adapterIds = new bytes32[](1);
        adapterIds[0] = keccak256("MockAdapter");

        vm.prank(user);
        uint256 amountOut = router.swap(
            address(weth),
            address(usdc),
            amountIn,
            expectedAmountOut, // [FIX #7] NEW: minAmountOut parameter
            adapterIds,
            ""
        );

        assertEq(amountOut, expectedAmountOut, "Incorrect amount out");
    }

    // [FIX #7] Test: Slippage protection in public swap
    function test_swap_slippageExceeded() public {
        uint256 amountIn = 1 ether;
        uint256 actualAmountOut = 2500 * 1e6; // Lower than expected
        uint256 minAmountOut = 3000 * 1e6;    // Higher expectation

        adapter.setAmountOut(address(weth), address(usdc), amountIn, actualAmountOut);
        deal(address(usdc), address(adapter), actualAmountOut);

        bytes32[] memory adapterIds = new bytes32[](1);
        adapterIds[0] = keccak256("MockAdapter");

        vm.prank(user);
        vm.expectRevert("SpotRouter: Slippage exceeded");
        router.swap(address(weth), address(usdc), amountIn, minAmountOut, adapterIds, "");
    }

    // [NEW FEATURE] Test: Session Key Registration
    function test_registerSessionKey() public {
        address[] memory allowedTokens = new address[](1);
        allowedTokens[0] = address(usdc);

        vm.prank(user);
        router.registerSessionKey(
            sessionKeyAddress,
            500 * 1e6,      // maxPerTx: 500 USDC
            5000 * 1e6,     // totalLimit: 5000 USDC
            block.timestamp + 30 days,
            allowedTokens
        );

        // Verify session key was registered
        (address owner, , , , , bool active) = router.sessionKeys(sessionKeyAddress);
        assertEq(owner, user, "Session key owner incorrect");
        assertTrue(active, "Session key not active");
    }

    // [NEW FEATURE] Test: Session Key Spending Limits
    function test_sessionKey_spendingLimitEnforced() public {
        address[] memory allowedTokens = new address[](1);
        allowedTokens[0] = address(usdc);

        vm.prank(user);
        router.registerSessionKey(
            sessionKeyAddress,
            500 * 1e6,      // maxPerTx: 500 USDC
            500 * 1e6,      // totalLimit: 500 USDC
            block.timestamp + 30 days,
            allowedTokens
        );

        ISpotRouter.SwapIntent memory intent = ISpotRouter.SwapIntent({
            user: user,
            tokenIn: address(usdc),
            tokenOut: address(weth),
            amountIn: 1000 * 1e6, // Exceeds limit
            minAmountOut: 0.3 ether,
            deadline: block.timestamp + 1 hours,
            nonce: 0,
            adapter: address(adapter),
            relayerFee: 0
        });

        bytes32 digest = getDigest(intent);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0x555, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(relayer);
        vm.expectRevert("Exceeds session key per-tx limit");
        router.executeSwap(intent, signature);
    }

    // [NEW FEATURE] Test: Session Key Revocation
    function test_revokeSessionKey() public {
        address[] memory allowedTokens = new address[](0);

        vm.prank(user);
        router.registerSessionKey(
            sessionKeyAddress,
            500 * 1e6,
            5000 * 1e6,
            block.timestamp + 30 days,
            allowedTokens
        );

        // Verify session key is active
        (, , , , , bool activeBefore) = router.sessionKeys(sessionKeyAddress);
        assertTrue(activeBefore, "Session key should be active");

        // Revoke session key
        vm.prank(user);
        router.revokeSessionKey(sessionKeyAddress);

        // Verify session key is inactive
        (, , , , , bool activeAfter) = router.sessionKeys(sessionKeyAddress);
        assertFalse(activeAfter, "Session key should be revoked");
    }

    function test_settleTrade_successful() public {
        // --- Setup ---
        uint256 amountIn = 1 ether;
        uint256 minAmountOut = 1950 * 1e6;
        uint256 finalAmountOut = 2000 * 1e6;
        uint256 relayerFee = 0.01 ether;
        uint256 feeBps = 50; // 0.5%

        // 1. Set up the fee controller
        feeController.setBaseFeeBps(feeBps);

        // 2. Fund LP and deposit to vault
        deal(address(usdc), lp, finalAmountOut);
        vm.startPrank(lp);
        usdc.approve(address(vault), finalAmountOut);
        vault.deposit(address(usdc), finalAmountOut);
        vm.stopPrank();

        // 3. Create and sign the swap intent
        ISpotRouter.SwapIntent memory intent = ISpotRouter.SwapIntent({
            user: user,
            tokenIn: address(weth),
            tokenOut: address(usdc),
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            deadline: block.timestamp + 1 hours,
            nonce: 0,
            adapter: address(0),
            relayerFee: relayerFee
        });

        bytes32 digest = getDigest(intent);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // 4. Calculate expected fees
        uint256 amountInAfterRelayerFee = amountIn - relayerFee;
        (uint256 expectedProtocolFee, ) = feeController.getSpotFee(user, address(weth), address(usdc), amountInAfterRelayerFee, address(0));
        uint256 netAmountIn = amountIn - relayerFee - expectedProtocolFee;

        // 5. Record balances before the trade
        uint256 userWethBefore = vault.balances(user, address(weth));
        uint256 userUsdcBefore = vault.balances(user, address(usdc));
        uint256 lpWethBefore = vault.balances(lp, address(weth));
        uint256 lpUsdcBefore = vault.balances(lp, address(usdc));
        uint256 relayerWethBefore = vault.balances(relayer, address(weth));
        uint256 treasuryWethBefore = vault.balances(treasury, address(weth));

        // --- Execution ---
        vm.prank(relayer);
        vm.expectEmit(true, true, true, true);
        emit IntentSpotRouter.Swap(user, address(weth), address(usdc), amountIn, finalAmountOut, expectedProtocolFee, relayerFee);
        router.settleTrade(intent, signature, lp, finalAmountOut);

        // --- Assertions ---
        uint256 userWethAfter = vault.balances(user, address(weth));
        uint256 userUsdcAfter = vault.balances(user, address(usdc));
        uint256 lpWethAfter = vault.balances(lp, address(weth));
        uint256 lpUsdcAfter = vault.balances(lp, address(usdc));
        uint256 relayerWethAfter = vault.balances(relayer, address(weth));
        uint256 treasuryWethAfter = vault.balances(treasury, address(weth));

        assertEq(userWethBefore - userWethAfter, amountIn, "User WETH incorrect");
        assertEq(userUsdcAfter - userUsdcBefore, finalAmountOut, "User USDC incorrect");
        assertEq(lpUsdcBefore - lpUsdcAfter, finalAmountOut, "LP USDC incorrect");
        assertEq(lpWethAfter - lpWethBefore, netAmountIn, "LP WETH incorrect");
        assertEq(relayerWethAfter - relayerWethBefore, relayerFee, "Relayer fee incorrect");
        assertEq(treasuryWethAfter - treasuryWethBefore, expectedProtocolFee, "Treasury fee incorrect");
    }

    function test_settleTrade_fails_insufficientLiquidity() public {
        // --- Setup ---
        uint256 amountIn = 1 ether;
        uint256 minAmountOut = 1950 * 1e6;
        uint256 finalAmountOut = 2000 * 1e6;
        uint256 lpLiquidity = 1500 * 1e6; // LP only has 1500 USDC

        deal(address(usdc), lp, lpLiquidity);
        vm.startPrank(lp);
        usdc.approve(address(vault), lpLiquidity);
        vault.deposit(address(usdc), lpLiquidity);
        vm.stopPrank();

        ISpotRouter.SwapIntent memory intent = ISpotRouter.SwapIntent({
            user: user,
            tokenIn: address(weth),
            tokenOut: address(usdc),
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            deadline: block.timestamp + 1 hours,
            nonce: 0,
            adapter: address(0),
            relayerFee: 0
        });

        bytes32 digest = getDigest(intent);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // --- Execution & Assertion ---
        vm.prank(relayer);
        vm.expectRevert("Insufficient liquidity");
        router.settleTrade(intent, signature, lp, finalAmountOut);
    }

    function test_settleTrade_fails_slippage() public {
        // --- Setup ---
        uint256 amountIn = 1 ether;
        uint256 minAmountOut = 2000 * 1e6;     // User wants at least 2000 USDC
        uint256 finalAmountOut = 1999 * 1e6;  // Relayer tries to settle for 1999 USDC

        deal(address(usdc), lp, finalAmountOut);
        vm.startPrank(lp);
        usdc.approve(address(vault), finalAmountOut);
        vault.deposit(address(usdc), finalAmountOut);
        vm.stopPrank();

        ISpotRouter.SwapIntent memory intent = ISpotRouter.SwapIntent({
            user: user,
            tokenIn: address(weth),
            tokenOut: address(usdc),
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            deadline: block.timestamp + 1 hours,
            nonce: 0,
            adapter: address(0),
            relayerFee: 0
        });

        bytes32 digest = getDigest(intent);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // --- Execution & Assertion ---
        vm.prank(relayer);
        vm.expectRevert("Slippage check failed");
        router.settleTrade(intent, signature, lp, finalAmountOut);
    }


    // --- Helper Functions ---

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
}
