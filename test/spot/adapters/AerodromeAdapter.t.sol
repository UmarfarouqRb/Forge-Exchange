// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {AerodromeAdapter} from "../../../contracts/spot/adapters/AerodromeAdapter.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IRouter} from "aerodrome/contracts/interfaces/IRouter.sol";
import {IFactoryRegistry} from "aerodrome/contracts/interfaces/factories/IFactoryRegistry.sol";

contract AerodromeAdapterTest is Test {
    using SafeERC20 for IERC20;

    AerodromeAdapter public adapter;
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    uint256 public constant USDC_DECIMALS = 6;

    function setUp() public {
        vm.createSelectFork(vm.envString("BASE_RPC_URL"), 38400000);
        adapter = new AerodromeAdapter();
        deal(USDC, address(this), 1_000_000 * 10**USDC_DECIMALS);
    }

    function test_quote() public {
        IFactoryRegistry factoryRegistry = IFactoryRegistry(IRouter(adapter.getRouter()).factoryRegistry());
        bool isApproved = factoryRegistry.isPoolFactoryApproved(address(adapter.FACTORY()));
        console.log("Is factory approved?", isApproved);
        if (!isApproved) {
            address[] memory factories = factoryRegistry.poolFactories();
            for (uint i = 0; i < factories.length; i++) {
                console.log("Approved factory:", factories[i]);
            }
        }

        uint256 amountIn = 1_000 * 10**USDC_DECIMALS;
        uint256 amountOut = adapter.quote(USDC, WETH, amountIn);
        assertTrue(amountOut > 0);
    }

    function test_swap() public {
        uint256 amountIn = 1_000 * 10**USDC_DECIMALS;
        IERC20(USDC).approve(address(adapter), amountIn);

        uint256 balanceBefore = IERC20(WETH).balanceOf(address(this));
        adapter.swap(USDC, WETH, amountIn, "");
        uint256 balanceAfter = IERC20(WETH).balanceOf(address(this));

        assertTrue(balanceAfter > balanceBefore);
    }
}
