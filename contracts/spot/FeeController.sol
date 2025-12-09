// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "openzeppelin-contracts/contracts/access/Ownable.sol";

/// @title FeeController
/// @notice Manage per-pair fees and default protocol/relayer splits (bps)
contract FeeController is Ownable {
    struct FeeConfig {
        uint24 swapFeeBps;       // total swap fee in basis points (e.g. 30 = 0.3%)
        uint24 protocolShareBps; // share of swapFee that goes to protocol treasury (0..10000)
        uint24 relayerShareBps;  // share of swapFee for relayer (0..10000)
        // NOTE: maker/taker splits or LP shares can be derived off-chain or extended
    }

    // mapping keccak(pair) where pair = abi.encodePacked(tokenA, tokenB)
    mapping(bytes32 => FeeConfig) public pairFees;
    FeeConfig public defaultFee;

    event PairFeeSet(bytes32 indexed pairHash, uint24 swapFeeBps, uint24 protocolShareBps, uint24 relayerShareBps);
    event DefaultFeeSet(uint24 swapFeeBps, uint24 protocolShareBps, uint24 relayerShareBps);

    constructor(address initialOwner, uint24 _swapFeeBps, uint24 _protocolShareBps, uint24 _relayerShareBps) Ownable(initialOwner) {
        require(_swapFeeBps <= 1000, "Fee: too large"); // default guard: <=10%
        defaultFee = FeeConfig({swapFeeBps: _swapFeeBps, protocolShareBps: _protocolShareBps, relayerShareBps: _relayerShareBps});
    }

    function setDefaultFee(uint24 swapFeeBps, uint24 protocolShareBps, uint24 relayerShareBps) external onlyOwner {
        require(swapFeeBps <= 1000, "Fee: too large");
        defaultFee = FeeConfig({swapFeeBps: swapFeeBps, protocolShareBps: protocolShareBps, relayerShareBps: relayerShareBps});
        emit DefaultFeeSet(swapFeeBps, protocolShareBps, relayerShareBps);
    }

    function setPairFee(address tokenA, address tokenB, uint24 swapFeeBps, uint24 protocolShareBps, uint24 relayerShareBps) external onlyOwner {
        require(swapFeeBps <= 1000, "Fee: too large");
        bytes32 key = _pairKey(tokenA, tokenB);
        pairFees[key] = FeeConfig({swapFeeBps: swapFeeBps, protocolShareBps: protocolShareBps, relayerShareBps: relayerShareBps});
        emit PairFeeSet(key, swapFeeBps, protocolShareBps, relayerShareBps);
    }

    function getFeeConfig(address tokenA, address tokenB) public view returns (FeeConfig memory) {
        bytes32 key = _pairKey(tokenA, tokenB);
        FeeConfig memory cfg = pairFees[key];
        if (cfg.swapFeeBps == 0) {
            return defaultFee;
        }
        return cfg;
    }

    /// @notice Calculate fee splitting given amountIn (amount before fee)
    /// @return amountAfterFee amount remaining after fee
    /// @return protocolAmount amount to protocol treasury
    /// @return relayerAmount amount to relayer
    function calculateFees(address tokenA, address tokenB, uint256 amountIn) external view returns (uint256 amountAfterFee, uint256 protocolAmount, uint256 relayerAmount) {
        FeeConfig memory cfg = getFeeConfig(tokenA, tokenB);
        uint256 fee = (amountIn * cfg.swapFeeBps) / 10000;
        protocolAmount = (fee * cfg.protocolShareBps) / 10000;
        relayerAmount = (fee * cfg.relayerShareBps) / 10000;
        // rest of fee can be used for LP or rewards (implicit)
        amountAfterFee = amountIn - fee;
        return (amountAfterFee, protocolAmount, relayerAmount);
    }

    function _pairKey(address a, address b) internal pure returns (bytes32) {
        // canonical ordering so (a,b) == (b,a)
        (address x, address y) = a < b ? (a, b) : (b, a);
        return keccak256(abi.encodePacked(x, y));
    }
}