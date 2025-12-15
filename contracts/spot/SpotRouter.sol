// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin-contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin-contracts/utils/ReentrancyGuard.sol";
import {VaultSpot} from "./VaultSpot.sol";
import {IAdapter} from "./interfaces/IAdapter.sol";
import {FeeController} from "./FeeController.sol";

contract SpotRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct SwapData {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        bytes32[] adapterIds;
        bytes data;
        uint256 bestAmountOut;
        address bestAdapter;
    }

    VaultSpot public vault;
    FeeController public feeController;

    mapping(bytes32 => address) public adapters;

    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 protocolFee,
        uint256 relayerFee
    );
    event AdapterAdded(bytes32 id, address adapter);
    event AdapterRemoved(bytes32 id);

    constructor(address _vault, address _feeController) Ownable(msg.sender) {
        vault = VaultSpot(_vault);
        feeController = FeeController(_feeController);
    }

    function addAdapter(bytes32 id, address adapter) external onlyOwner {
        adapters[id] = adapter;
        emit AdapterAdded(id, adapter);
    }

    function removeAdapter(bytes32 id) external onlyOwner {
        adapters[id] = address(0);
        emit AdapterRemoved(id);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes32[] calldata adapterIds,
        bytes calldata data
    ) external nonReentrant {
        SwapData memory swapData = SwapData(
            tokenIn,
            tokenOut,
            amountIn,
            adapterIds,
            data,
            0,
            address(0)
        );

        vault.debit(msg.sender, swapData.tokenIn, swapData.amountIn);

        for (uint i = 0; i < swapData.adapterIds.length; i++) {
            address adapterAddress = adapters[swapData.adapterIds[i]];
            if (adapterAddress != address(0)) {
                IAdapter adapter = IAdapter(adapterAddress);
                try adapter.swap(swapData.tokenIn, swapData.tokenOut, swapData.amountIn, swapData.data) returns (uint256 currentAmountOut) {
                    if (currentAmountOut > swapData.bestAmountOut) {
                        swapData.bestAmountOut = currentAmountOut;
                        swapData.bestAdapter = adapterAddress;
                    }
                } catch {}
            }
        }

        require(swapData.bestAdapter != address(0), "NO_VALID_ADAPTER");

        address router = IAdapter(swapData.bestAdapter).getRouter();
        vault.approveToken(swapData.tokenIn, router, swapData.amountIn);

        uint256 balanceBefore = IERC20(swapData.tokenOut).balanceOf(address(vault));
        IAdapter(swapData.bestAdapter).swap(swapData.tokenIn, swapData.tokenOut, swapData.amountIn, swapData.data);
        uint256 amountOut = IERC20(swapData.tokenOut).balanceOf(address(vault)) - balanceBefore;

        vault.resetTokenApproval(swapData.tokenIn, router);

        (uint256 amountAfterFee, uint256 protocolFee, uint256 relayerFee) = feeController.calculateFees(
            swapData.tokenIn,
            swapData.tokenOut,
            amountOut
        );

        vault.credit(msg.sender, swapData.tokenOut, amountAfterFee);
        if (protocolFee > 0) {
            vault.collectFee(swapData.tokenOut, protocolFee);
        }

        emit Swap(msg.sender, swapData.tokenIn, swapData.tokenOut, swapData.amountIn, amountOut, protocolFee, relayerFee);
    }
}
