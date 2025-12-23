// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SessionKeyManager is EIP712 {
    bytes32 public constant AUTHORIZATION_TYPEHASH =
        keccak256("Authorization(address sessionKey,uint256 expiration)");

    // Mapping: user => session key => expiration timestamp
    mapping(address => mapping(address => uint256)) public authorizedSessionKeys;

    event SessionKeyAuthorized(
        address indexed user,
        address indexed sessionKey,
        uint256 expiration
    );

    event SessionKeyRevoked(
        address indexed user,
        address indexed sessionKey
    );

    constructor() EIP712("SessionKeyManager", "1") {}

    function authorizeSessionKey(
        address sessionKey,
        uint256 expiration,
        bytes calldata signature
    ) external {
        require(expiration > block.timestamp, "SessionKeyManager: Expiration must be in the future");

        bytes32 structHash = keccak256(
            abi.encode(AUTHORIZATION_TYPEHASH, sessionKey, expiration)
        );
        bytes32 digest = _hashTypedDataV4(structHash);

        address user = ECDSA.recover(digest, signature);
        require(user != address(0), "SessionKeyManager: Invalid signature");

        authorizedSessionKeys[user][sessionKey] = expiration;

        emit SessionKeyAuthorized(user, sessionKey, expiration);
    }

    function revokeSessionKey(address sessionKey) external {
        require(
            authorizedSessionKeys[msg.sender][sessionKey] > 0,
            "SessionKeyManager: Session key not authorized"
        );
        
        delete authorizedSessionKeys[msg.sender][sessionKey];

        emit SessionKeyRevoked(msg.sender, sessionKey);
    }

    function isSessionKeyAuthorized(address user, address sessionKey)
        public
        view
        returns (bool)
    {
        uint256 expiration = authorizedSessionKeys[user][sessionKey];
        return expiration > 0 && expiration > block.timestamp;
    }
}
