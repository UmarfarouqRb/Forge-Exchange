
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IAdapter} from "./interfaces/IAdapter.sol";
import {Ownable} from "@openzeppelin-contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";

contract AMMAggregator is Ownable {
    event AdapterAdded(string indexed adapterId, address indexed adapterAddress);
    event AdapterRemoved(string indexed adapterId);
    event BestQuote(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 bestOut, string adapterId);

    mapping(string => IAdapter) public adapters;
    string[] public adapterIds;

    constructor(address initialOwner) Ownable(initialOwner) {}

    function addAdapter(string calldata adapterId, address adapterAddress) external onlyOwner {
        require(adapterAddress != address(0), "Invalid address");
        adapters[adapterId] = IAdapter(adapterAddress);
        adapterIds.push(adapterId);
        emit AdapterAdded(adapterId, adapterAddress);
    }

    function removeAdapter(string calldata adapterId) external onlyOwner {
        require(address(adapters[adapterId]) != address(0), "Adapter not found");
        delete adapters[adapterId];
        for (uint i = 0; i < adapterIds.length; i++) {
            if (keccak256(abi.encodePacked(adapterIds[i])) == keccak256(abi.encodePacked(adapterId))) {
                adapterIds[i] = adapterIds[adapterIds.length - 1];
                adapterIds.pop();
                break;
            }
        }
        emit AdapterRemoved(adapterId);
    }

    function bestQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public returns (uint256 bestOut, string memory bestAdapterId) {
        for (uint i = 0; i < adapterIds.length; i++) {
            try adapters[adapterIds[i]].quote(tokenIn, tokenOut, amountIn) returns (uint256 amountOut) {
                if (amountOut > bestOut) {
                    bestOut = amountOut;
                    bestAdapterId = adapterIds[i];
                }
            } catch {}
        }
        emit BestQuote(tokenIn, tokenOut, amountIn, bestOut, bestAdapterId);
    }

    function swapBest(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata data
    ) external returns (uint256 amountOut, string memory usedAdapter) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        (, string memory bestId) = bestQuote(tokenIn, tokenOut, amountIn);
        require(bytes(bestId).length > 0, "AMMAgg: no route");
        usedAdapter = bestId;

        if (IERC20(tokenIn).allowance(address(this), address(adapters[bestId])) > 0) {
            IERC20(tokenIn).approve(address(adapters[bestId]), 0);
        }
        IERC20(tokenIn).approve(address(adapters[bestId]), amountIn);
        
        amountOut = adapters[bestId].swap(tokenIn, tokenOut, amountIn, minAmountOut, data);
    }
}
