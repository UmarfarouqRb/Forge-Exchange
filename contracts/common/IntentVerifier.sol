// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "lib/openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";

/**
 * @title IntentVerifier
 * @notice Base contract for verifying user intents via EIP-712 signatures.
 * @dev Provides shared logic for nonce management and deadline checking to prevent
 *      replay attacks and the execution of expired intents.
 *      This contract is designed to be inherited by routers like SpotRouter and LimitOrderRouter.
 */
abstract contract IntentVerifier is EIP712 {
    /// @dev Keccak256 hash of the type string "cancel(uint256 nonce)"
    bytes32 public constant CANCEL_TYPEHASH = 0x546c14101d23693e4f35838d1729863830a3ec576353388a755b40d43dfa2842;

    // Nonces mapping to prevent signature replay attacks.
    mapping(address => uint256) public nonces;

    /**
     * @notice Initializes the EIP-712 domain separator.
     * @param name The EIP-712 domain name.
     * @param version The EIP-712 domain version.
     */
    constructor(string memory name, string memory version) EIP712(name, version) {}

    /**
     * @notice Uses a nonce for a given user, incrementing it to prevent reuse.
     * @param user The address of the user whose nonce is being used.
     * @param nonce The nonce to validate and use.
     * @dev Reverts if the provided nonce is not the expected next nonce for the user.
     *      The nonce is incremented after the check.
     */
    function _useNonce(address user, uint256 nonce) internal {
        require(nonces[user] == nonce, "IntentVerifier: Invalid nonce");
        nonces[user]++;
    }

    /**
     * @notice Checks if the current block timestamp is within the deadline.
     * @param deadline The timestamp by which the intent must be executed.
     * @dev Reverts if the deadline has passed.
     */
    function _checkDeadline(uint256 deadline) internal view {
        require(block.timestamp <= deadline, "IntentVerifier: Expired");
    }
}
