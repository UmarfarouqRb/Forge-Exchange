// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin-contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin-contracts/utils/ReentrancyGuard.sol";

import {IAdapter} from "./interfaces/IAdapter.sol";
import {VaultSpot} from "./VaultSpot.sol";
import {FeeController} from "./FeeController.sol";

contract SpotRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Events ---
    event AdapterAdded(bytes32 indexed id, address indexed adapter);
    event AdapterRemoved(bytes32 indexed id);
    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 protocolFee,
        uint256 relayerFee
    );

    // --- State Variables ---
    VaultSpot public immutable vault;
    FeeController public immutable feeController;
    mapping(bytes32 => IAdapter) public adapters;
    mapping(bytes32 => bool) public whitelistedAdapters;

    constructor(address _vault, address _feeController) Ownable(msg.sender) {
        vault = VaultSpot(_vault);
        feeController = FeeController(_feeController);
    }

    // --- Admin Functions ---
    function addAdapter(bytes32 id, address adapter) external onlyOwner {
        require(adapters[id] == IAdapter(address(0)), "Adapter already exists");
        adapters[id] = IAdapter(adapter);
        whitelistedAdapters[id] = true;
        emit AdapterAdded(id, adapter);
    }

    function removeAdapter(bytes32 id) external onlyOwner {
        require(adapters[id] != IAdapter(address(0)), "Adapter does not exist");
        delete adapters[id];
        delete whitelistedAdapters[id];
        emit AdapterRemoved(id);
    }

    // --- Public Swap Logic ---
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes32[] calldata adapterIds,
        bytes calldata data
    ) external nonReentrant returns (uint256 amountOut) {
        require(adapterIds.length > 0, "Must specify at least one adapter");

        vault.debit(msg.sender, tokenIn, amountIn);
        _pullTokensFromVault(tokenIn, amountIn);

        amountOut = _executeSwap(tokenIn, tokenOut, amountIn, adapterIds, data);

        (uint256 amountAfterFee, uint256 protocolFee, ) = feeController.calculateFees(
            tokenIn,
            tokenOut,
            amountOut
        );

        IERC20(tokenOut).safeTransfer(address(vault), amountOut);
        vault.credit(msg.sender, tokenOut, amountAfterFee);
        if (protocolFee > 0) {
            vault.collectFee(tokenOut, protocolFee);
        }

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, protocolFee, 0);
        return amountAfterFee;
    }

    // --- Internal Swap Execution with Fallback ---
    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes32[] calldata adapterIds,
        bytes calldata data
    ) internal returns (uint256) {
        uint256 bestAmountOut = 0;
        bytes32 bestAdapterId;

        // Find the best quote from all adapters
        for (uint i = 0; i < adapterIds.length; ++i) {
            bytes32 id = adapterIds[i];
            if (!whitelistedAdapters[id]) continue;

            try adapters[id].quote(tokenIn, tokenOut, amountIn) returns (uint256 amount) {
                if (amount > bestAmountOut) {
                    bestAmountOut = amount;
                    bestAdapterId = id;
                }
            } catch {}
        }

        require(bestAmountOut > 0, "No valid quote found");

        // Execute the swap with the best adapter
        IAdapter bestAdapter = adapters[bestAdapterId];
        IERC20(tokenIn).approve(address(bestAdapter), amountIn);
        uint256 executedAmountOut = bestAdapter.swap(tokenIn, tokenOut, amountIn, data);
        
        require(executedAmountOut >= bestAmountOut, "Swap execution failed to meet quote");

        return executedAmountOut;
    }

    // --- Internal Helper Functions ---
    function _pullTokensFromVault(address token, uint256 amount) internal {
        vault.approveToken(token, address(this), amount);
        IERC20(token).safeTransferFrom(address(vault), address(this), amount);
        vault.resetTokenApproval(token, address(this));
    }
}