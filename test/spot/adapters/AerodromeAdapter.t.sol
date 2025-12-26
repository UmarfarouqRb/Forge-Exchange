// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {AerodromeAdapter} from "../../../contracts/spot/adapters/AerodromeAdapter.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IRouter} from "aerodrome/contracts/interfaces/IRouter.sol";
import {IFactoryRegistry} from "aerodrome/contracts/interfaces/factories/IFactoryRegistry.sol";
import {IntentSpotRouter} from "../../../contracts/spot/IntentSpotRouter.sol";
import {VaultSpot} from "../../../contracts/spot/VaultSpot.sol";
import {FeeController} from "../../../contracts/spot/FeeController.sol";
import {ISpotRouter} from "../../../contracts/spot/interfaces/ISpotRouter.sol";

contract AerodromeAdapterTest is Test {
    using SafeERC20 for IERC20;

    AerodromeAdapter public adapter;
    IntentSpotRouter internal router;
    VaultSpot internal vault;
    FeeController internal feeController;

    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    uint256 public constant USDC_DECIMALS = 6;

    address internal treasury = address(0x3);
    address internal user;
    uint256 internal userPrivateKey = 0x123;

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("base"), 38400000);

        user = vm.addr(userPrivateKey);

        adapter = new AerodromeAdapter();
        vault = new VaultSpot();
        feeController = new FeeController(address(this), treasury, 0, 1000);
        router = new IntentSpotRouter(address(vault), address(feeController), "IntentSpotRouter", "1.0");
        
        vault.setRouter(address(router));
        bytes32 adapterId = keccak256(bytes("aerodrome"));
        router.addAdapter(adapterId, address(adapter));

        deal(USDC, user, 1_000_000 * 10**USDC_DECIMALS);
    }

    function test_quote() public {
        uint256 amountIn = 1_000 * 10**USDC_DECIMALS;
        uint256 amountOut = adapter.quote(USDC, WETH, amountIn);
        assertTrue(amountOut > 0, "Quote amount should be positive");
    }

    function test_swap() public {
        uint256 amountIn = 1_000 * 10**USDC_DECIMALS;
        
        vm.startPrank(user);
        IERC20(USDC).approve(address(vault), amountIn);
        vault.deposit(USDC, amountIn);
        vm.stopPrank();

        uint256 balanceBefore = vault.balances(user, WETH);
        console.log("Balance before swap:", balanceBefore);

        ISpotRouter.SwapIntent memory intent = ISpotRouter.SwapIntent({
            user: user,
            tokenIn: USDC,
            tokenOut: WETH,
            amountIn: amountIn,
            minAmountOut: 0,
            deadline: block.timestamp + 1 hours,
            nonce: 0,
            adapter: address(adapter)
        });

        bytes32 digest = getDigest(intent);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        console.log("Balance of user before swap (USDC):", IERC20(USDC).balanceOf(user));
        console.log("Balance of adapter before swap (USDC):", IERC20(USDC).balanceOf(address(adapter)));

        router.executeSwap(intent, signature);

        uint256 balanceAfter = vault.balances(user, WETH);
        console.log("Balance after swap:", balanceAfter);
        console.log("Balance of user after swap (USDC):", IERC20(USDC).balanceOf(user));
        console.log("Balance of adapter after swap (USDC):", IERC20(USDC).balanceOf(address(adapter)));
        assertTrue(balanceAfter > balanceBefore, "WETH balance should increase after swap");
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
            intent.adapter
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
