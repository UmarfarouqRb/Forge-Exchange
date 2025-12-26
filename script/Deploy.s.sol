// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "../contracts/spot/VaultSpot.sol";
import "../contracts/spot/IntentSpotRouter.sol";
import "../contracts/spot/FeeController.sol";
import "../contracts/spot/adapters/PancakeV3Adapter.sol";
import "../contracts/spot/adapters/UniswapV2Adapter.sol";
import "../contracts/spot/adapters/AerodromeAdapter.sol";
import "../lib/universal-router/lib/solmate/src/tokens/WETH.sol";

contract Deploy is Script {
    using stdJson for string;

    // --- Environment Variables ---
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY_DEPLOY");
    address deployerAddress = vm.rememberKey(deployerPrivateKey);
    address multisig = vm.envAddress("MULTISIG");
    string public outputFilename = vm.envString("OUTPUT_FILENAME");
    string public jsonOutput;


    function run() public {
        vm.startBroadcast(deployerPrivateKey);

        // Deploy WETH for testing purposes if needed (on a local network)
        WETH weth = new WETH();

        // 1. Deploy VaultSpot
        VaultSpot vault = new VaultSpot();

        // 2. Deploy FeeController
        // Default fees: 0.1% base fee, 1% max fee
        FeeController feeController = new FeeController(deployerAddress, multisig, 20, 100);

        // 3. Deploy IntentSpotRouter
        IntentSpotRouter router = new IntentSpotRouter(address(vault), address(feeController), "IntentSpotRouter", "1.0");

        // 4. Deploy Adapters
        PancakeV3Adapter pancakeV3Adapter = new PancakeV3Adapter();
        UniswapV2Adapter uniswapV2Adapter = new UniswapV2Adapter();
        AerodromeAdapter aerodromeAdapter = new AerodromeAdapter();

        // 5. Configure router with adapters
        router.addAdapter(keccak256("pancakev3"), address(pancakeV3Adapter));
        router.addAdapter(keccak256("uniswapv2"), address(uniswapV2Adapter));
        router.addAdapter(keccak256("aerodrome"), address(aerodromeAdapter));

        // 6. Configure vault
        vault.setRouter(address(router));

        // 7. Transfer Ownership to MULTISIG
        vault.transferOwnership(multisig);
        router.transferOwnership(multisig);
        feeController.transferOwnership(multisig);

        vm.stopBroadcast();

        // 8. Save deployed addresses to a file
        string memory root = vm.projectRoot();
        string memory basePath = string.concat(root, "/script/constants/output/");
        string memory path = string.concat(basePath, outputFilename);

        jsonOutput = "{}";
        jsonOutput = jsonOutput.serialize("weth", address(weth));
        jsonOutput = jsonOutput.serialize("vault", address(vault));
        jsonOutput = jsonOutput.serialize("router", address(router));
        jsonOutput = jsonOutput.serialize("feeController", address(feeController));
        jsonOutput = jsonOutput.serialize("pancakeV3Adapter", address(pancakeV3Adapter));
        jsonOutput = jsonOutput.serialize("uniswapV2Adapter", address(uniswapV2Adapter));
        jsonOutput = jsonOutput.serialize("aerodromeAdapter", address(aerodromeAdapter));


        vm.writeFile(path, jsonOutput);
    }
}
