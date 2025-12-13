
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";

// Target contracts
import {VaultSpot} from "../../contracts/spot/VaultSpot.sol";
import {FeeController} from "../../contracts/spot/FeeController.sol";
import {AMMAggregator} from "../../contracts/spot/AMMAggregator.sol";
import {SpotRouter} from "../../contracts/spot/SpotRouter.sol";

// Adapters
import {PancakeV3Adapter} from "../../contracts/spot/adapters/PancakeV3Adapter.sol";
import {UniswapUniversalRouterAdapter} from "../../contracts/spot/adapters/UniswapUniversalRouterAdapter.sol";
import {SushiV2Adapter} from "../../contracts/spot/adapters/SushiV2Adapter.sol";

contract SpotTest is Test {
    using SafeERC20 for IERC20;

    // Base Mainnet Addresses
    address internal constant WETH = 0x4200000000000000000000000000000000000006;
    address internal constant USDBC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    // Test user & treasury
    address internal constant USER = 0x1a1A1A1A1a1A1A1a1A1a1a1a1a1a1a1A1A1a1a1a;
    address internal constant TREASURY = 0xBeA5000000000000000000000000000000000000;

    // Contracts
    VaultSpot internal vault;
    FeeController internal feeController;
    AMMAggregator internal aggregator;
    SpotRouter internal router;

    // Adapters
    PancakeV3Adapter internal pancakeAdapter;
    UniswapUniversalRouterAdapter internal uniswapAdapter;
    SushiV2Adapter internal sushiswapAdapter;

    function setUp() public {
        vm.startPrank(USER);
        // Deploy core contracts
        vault = new VaultSpot(USER, TREASURY);
        feeController = new FeeController(USER, 10, 50, 5);
        aggregator = new AMMAggregator(USER);
        router = new SpotRouter(USER, address(vault), address(feeController), address(aggregator));

        // Deploy adapters
        pancakeAdapter = new PancakeV3Adapter();
        uniswapAdapter = new UniswapUniversalRouterAdapter();
        sushiswapAdapter = new SushiV2Adapter();

        // Configure core contracts
        vault.setRouterAllowed(address(router), true);
        aggregator.addAdapter("PancakeV3", address(pancakeAdapter));
        aggregator.addAdapter("UniswapUniversalRouter", address(uniswapAdapter));
        aggregator.addAdapter("SushiSwapV2", address(sushiswapAdapter));
        vm.stopPrank();

        // Fund user account
        deal(USDBC, USER, 10000 * 1e6);
    }

    function test_EndToEnd_Swap() public {
        uint256 amountIn = 1000 * 1e6; // 1000 USDC

        vm.startPrank(USER);
        IERC20(USDBC).approve(address(vault), amountIn);
        vault.deposit(USDBC, amountIn);

        uint256 initialUserBalance = vault.balanceOf(USER, USDBC);
        assertEq(initialUserBalance, amountIn, "Initial balance mismatch");

        (, string memory bestAdapter) = aggregator.bestQuote(USDBC, WETH, amountIn);
        bytes memory data;
        if (keccak256(abi.encodePacked(bestAdapter)) == keccak256(abi.encodePacked("UniswapUniversalRouter"))) {
            data = abi.encode(uint24(500)); // Fee tier for USDC/WETH on Uniswap
        }

        router.swap(USDBC, WETH, amountIn, 0, data);
        vm.stopPrank();

        uint256 finalUserBalance = vault.balanceOf(USER, WETH);
        assertTrue(finalUserBalance > 0, "No WETH received");
    }
}
