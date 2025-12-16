// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPancakeV3Pool} from "lib/pancake-v3-contracts/projects/v3-core/contracts/interfaces/IPancakeV3Pool.sol";

library PancakeV3Helper {
    function getPool(address tokenA, address tokenB, uint24 fee) internal view returns (IPancakeV3Pool) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        address poolAddress = address(uint160(uint256(keccak256(abi.encodePacked(
            hex"ff",
            0x1b81D678ffb9C0263b24A97847620C99d213eB14, // PancakeV3 Factory
            keccak256(abi.encode(token0, token1)),
            fee,
            hex"d67953100205869c9913a8f015822e1577c38575039e14a277028551f3414995" // Pool init code hash
        )))));
        return IPancakeV3Pool(poolAddress);
    }
}
