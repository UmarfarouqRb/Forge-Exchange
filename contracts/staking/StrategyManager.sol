
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract StrategyManager {
    address public owner;
    address public activeStrategy;

    constructor() {
        owner = msg.sender;
    }

    function setStrategy(address strategy) external onlyOwner {
        activeStrategy = strategy;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
}
