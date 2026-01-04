// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {VaultSpot} from "contracts/spot/VaultSpot.sol";
import {SpotRouter} from "contracts/spot/SpotRouter.sol";
import {FeeController} from "contracts/spot/FeeController.sol";
import {MockERC20} from "test/mocks/MockERC20.sol";
import {IAdapter} from "contracts/spot/interfaces/IAdapter.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";

contract MockAdapter is IAdapter {
    uint256 private _fixedAmountOut;

    constructor(uint256 fixedAmountOut) {
        _fixedAmountOut = fixedAmountOut;
    }

    function quote(address, address, uint256) external view returns (uint256) {
        return _fixedAmountOut;
    }

    function swap(address tokenIn, address tokenOut, uint256 amountIn, bytes calldata) external returns (uint256) {
        // The router is msg.sender. It has approved this contract to take 'amountIn' of 'tokenIn'.
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // The adapter has been minted 'tokenOut' and now sends them to the router.
        IERC20(tokenOut).transfer(msg.sender, _fixedAmountOut);

        return _fixedAmountOut;
    }

    function getRouter() external view returns (address) {
        return address(this);
    }
}

contract ProtocolFeeTest is Test {
    VaultSpot internal vault;
    SpotRouter internal router;
    FeeController internal feeController;
    MockAdapter internal mockAdapter;
    MockERC20 internal weth;
    MockERC20 internal usdc;

    address internal constant USER = address(0x100);
    address internal constant MULTISIG = address(0x200);

    uint256 internal constant SWAP_AMOUNT_IN = 1 ether;
    uint256 internal constant SIMULATED_AMOUNT_OUT = 3000 * 1e18;

    uint256 internal constant SWAP_FEE_BPS = 100;

    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 protocolFee,
        uint256 relayerFee
    );

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("base"));

        vm.prank(MULTISIG);
        vault = new VaultSpot();

        vm.prank(MULTISIG);
        feeController = new FeeController(MULTISIG, MULTISIG, SWAP_FEE_BPS, 1000);

        // Corrected: Deploy the router with MULTISIG as the owner
        vm.prank(MULTISIG);
        router = new SpotRouter(address(vault), address(feeController));

        weth = new MockERC20("Wrapped Ether", "WETH");
        usdc = new MockERC20("USD Coin", "USDC");

        mockAdapter = new MockAdapter(SIMULATED_AMOUNT_OUT);

        vm.prank(MULTISIG);
        vault.setRouter(address(router));

        vm.prank(MULTISIG);
        router.addAdapter(bytes32("mock"), address(mockAdapter));

        weth.mint(USER, SWAP_AMOUNT_IN);

        vm.startPrank(USER);
        weth.approve(address(vault), SWAP_AMOUNT_IN);
        vault.deposit(address(weth), SWAP_AMOUNT_IN);
        vm.stopPrank();

        usdc.mint(address(mockAdapter), SIMULATED_AMOUNT_OUT);
    }

    function test_CollectsProtocolFee() public {
        uint256 expectedProtocolFee = (SWAP_AMOUNT_IN * SWAP_FEE_BPS) / 10_000;
        uint256 amountInAfterFee = SWAP_AMOUNT_IN - expectedProtocolFee;

        vm.expectEmit(true, true, true, true, address(router));
        emit Swap(
            USER,
            address(weth),
            address(usdc),
            SWAP_AMOUNT_IN,
            SIMULATED_AMOUNT_OUT,
            expectedProtocolFee,
            0
        );

        bytes32[] memory adapterIds = new bytes32[](1);
        adapterIds[0] = "mock";
        vm.prank(USER);
        router.swap(address(weth), address(usdc), SWAP_AMOUNT_IN, adapterIds, "");

        uint256 multisigFeeBalance = IERC20(weth).balanceOf(MULTISIG);
        assertEq(multisigFeeBalance, expectedProtocolFee, "Multi-sig should have collected the protocol fee");

        uint256 userFinalBalance = vault.balances(USER, address(usdc));
        assertEq(userFinalBalance, SIMULATED_AMOUNT_OUT, "User should receive amount out minus protocol fee");

        uint256 userWethBalance = vault.balances(USER, address(weth));
        assertEq(userWethBalance, 0, "User WETH balance should be zero after swap");
    }
}
