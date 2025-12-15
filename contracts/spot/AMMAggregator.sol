// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin-contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {IAdapter} from "./interfaces/IAdapter.sol";

contract AMMAggregator is Ownable {
    using SafeERC20 for IERC20;

    event AdapterAdded(bytes32 indexed adapterId, address indexed adapterAddress);
    event AdapterRemoved(bytes32 indexed adapterId);
    event Swapped(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        string adapterId
    );

    struct Adapter {
        address adapterAddress;
        string adapterId;
    }

    Adapter[] public adapters;
    mapping(bytes32 => address) public adapterAddresses;

    constructor(address initialOwner) Ownable(initialOwner) {}

    function addAdapter(string calldata _adapterId, address _adapterAddress) external onlyOwner {
        bytes32 adapterId = keccak256(abi.encodePacked(_adapterId));
        require(adapterAddresses[adapterId] == address(0), "Adapter already exists");

        adapters.push(Adapter({adapterAddress: _adapterAddress, adapterId: _adapterId}));
        adapterAddresses[adapterId] = _adapterAddress;

        emit AdapterAdded(adapterId, _adapterAddress);
    }

    function removeAdapter(string calldata _adapterId) external onlyOwner {
        bytes32 adapterId = keccak256(abi.encodePacked(_adapterId));
        require(adapterAddresses[adapterId] != address(0), "Adapter not found");

        for (uint256 i = 0; i < adapters.length; i++) {
            if (keccak256(abi.encodePacked(adapters[i].adapterId)) == adapterId) {
                adapters[i] = adapters[adapters.length - 1];
                adapters.pop();
                break;
            }
        }

        delete adapterAddresses[adapterId];
        emit AdapterRemoved(adapterId);
    }

    function getBestQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public returns (uint256 bestOut, string memory bestAdapterId) {
        require(adapters.length > 0, "No adapters configured");
        for (uint256 i = 0; i < adapters.length; i++) {
            try IAdapter(adapters[i].adapterAddress).quote(tokenIn, tokenOut, amountIn) returns (uint256 amountOut) {
                if (amountOut > bestOut) {
                    bestOut = amountOut;
                    bestAdapterId = adapters[i].adapterId;
                }
            } catch {
                // Ignore adapters that fail to quote
            }
        }
    }

    function swapBest(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata data
    ) external returns (uint256 amountOut) {
        // Find the best adapter for a simple quote
        (uint256 bestQuote, string memory bestAdapterId) = getBestQuote(tokenIn, tokenOut, amountIn);
        require(bestQuote > 0, "No quote available");
        
        address bestAdapterAddress = adapterAddresses[keccak256(abi.encodePacked(bestAdapterId))];

        // Transfer tokens from user to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Get the router for the chosen adapter and approve it to spend the tokens
        address router = IAdapter(bestAdapterAddress).getRouter();
        IERC20(tokenIn).approve(router, amountIn);

        // Perform the swap on the best adapter
        amountOut = IAdapter(bestAdapterAddress).swap(
            tokenIn,
            tokenOut,
            amountIn,
            data
        );
        
        // Slippage check
        require(amountOut >= minAmountOut, "Slippage protection failed");

        // The adapter is expected to send the output tokens to this contract.
        // Transfer the output tokens to the user.
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Refund any remaining dust of input token
        uint256 remaining = IERC20(tokenIn).balanceOf(address(this));
        if (remaining > 0) {
            IERC20(tokenIn).safeTransfer(msg.sender, remaining);
        }
        
        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut, bestAdapterId);
    }
}
