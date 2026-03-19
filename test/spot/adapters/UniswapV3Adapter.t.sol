// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console, console2} from "forge-std/Test.sol";
import {UniswapV3Adapter} from "contracts/spot/adapters/UniswapV3Adapter.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IntentSpotRouter} from "contracts/spot/IntentSpotRouter.sol";
import {VaultSpot} from "contracts/spot/VaultSpot.sol";
import {FeeController} from "contracts/spot/FeeController.sol";
import {ISpotRouter} from "contracts/spot/interfaces/ISpotRouter.sol";

contract UniswapV3AdapterTest is Test {
    using SafeERC20 for IERC20;

    // --- Constants ---
    string public constant BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org";

    // --- Contracts ---
    UniswapV3Adapter internal adapter;
    IntentSpotRouter internal router;
    VaultSpot internal vault;
    FeeController internal feeController;

    // --- Tokens ---
    IERC20 internal constant WETH = IERC20(0x4200000000000000000000000000000000000006);
    IERC20 internal constant USDC = IERC20(0x036CbD53842c5426634e7929541eC2318f3dCF7e);
    uint256 public constant USDC_DECIMALS = 6;

    // --- Users ---
    address internal treasury = address(0x3);
    address internal user;
    uint256 internal userPrivateKey = 0x123;

    function setUp() public {
        vm.createSelectFork(BASE_SEPOLIA_RPC_URL);

        user = vm.addr(userPrivateKey);

        adapter = new UniswapV3Adapter();
        vault = new VaultSpot();
        feeController = new FeeController(address(this), treasury, 0, 1000);
        router = new IntentSpotRouter(payable(address(vault)), address(feeController), "IntentSpotRouter", "1.0");

        vault.setRouter(address(router));
        bytes32 adapterId = keccak256(bytes("uniswapv3"));
        router.addAdapter(adapterId, address(adapter));

        deal(address(WETH), user, 1 ether);
        deal(address(USDC), user, 1_000_000 * 10**USDC_DECIMALS);
    }

    function test_quote() public {
        uint256 amountIn = 1 ether;
        uint256 amountOut = adapter.quote(address(WETH), address(USDC), amountIn);
        assertTrue(amountOut > 0, "Quote should be greater than 0");
    }

    function test_swap() public {
        uint256 amountIn = 1 ether;

        vm.startPrank(user);
        WETH.approve(address(vault), amountIn);
        vault.deposit(address(WETH), amountIn);
        vm.stopPrank();

        uint256 balanceBefore = vault.balances(user, address(USDC));
        console.log("Balance before swap:", balanceBefore);

        ISpotRouter.SwapIntent memory intent = ISpotRouter.SwapIntent({
            user: user,
            tokenIn: address(WETH),
            tokenOut: address(USDC),
            amountIn: amountIn,
            minAmountOut: 0,
            deadline: block.timestamp + 1 hours,
            nonce: 0,
            adapter: address(adapter),
            relayerFee: 0
        });

        bytes32 digest = getDigest(intent);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        router.executeSwap(intent, signature);

        uint256 balanceAfter = vault.balances(user, address(USDC));
        console.log("Balance after swap:", balanceAfter);
        assertTrue(balanceAfter > balanceBefore, "USDC balance should increase after swap");
    }

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
