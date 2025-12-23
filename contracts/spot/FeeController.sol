// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

/// @dev Defines the standard interface for the FeeController.
/// @dev Routers call this interface to determine fee amounts and recipients without needing to know the underlying business logic.
interface IFeeController {
    /// @notice Gets the fee details for a given spot trade.
    /// @param user The address of the user executing the swap.
    /// @param tokenIn The token being provided by the user.
    /// @param tokenOut The token being received by the user.
    /// @param amountIn The amount of `tokenIn` being swapped.
    /// @param adapter The address of the swap adapter being used.
    /// @return feeAmount The calculated fee amount in `tokenIn` units.
    /// @return feeRecipient The address where the fee should be sent.
    function getSpotFee(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address adapter
    ) external view returns (
        uint256 feeAmount,
        address feeRecipient
    );
}

/// @title FeeController
/// @notice Manages dynamic protocol fees for swaps based on multiple dimensions.
/// @dev This contract is a policy engine, not an execution engine. It determines fee rates
///      and recipients but does not handle token transfers or balance accounting.
contract FeeController is Ownable, IFeeController {

    // --- State Variables ---

    /// @notice The default fee in basis points (e.g., 10 = 0.10%).
    uint256 public baseFeeBps;

    /// @notice The recipient of collected protocol fees.
    address public treasury;

    /// @notice The maximum permissible fee in basis points to prevent misconfiguration (e.g., 100 = 1%).
    uint256 public maxFeeBps;

    /// @notice Pair-specific fee overrides, keyed by keccak256(abi.encodePacked(sorted_token_pair)).
    /// @dev A value of 0 is treated as "not set", causing a fallback to the next fee tier.
    mapping(bytes32 => uint256) public pairFeeBps;

    /// @notice Adapter-specific fee overrides.
    /// @dev A value of 0 is treated as "not set", causing a fallback to the next fee tier.
    mapping(address => uint256) public adapterFeeBps;

    /// @notice User-specific discounts in basis points.
    mapping(address => uint256) public userDiscountBps;

    // --- Events ---

    event BaseFeeBpsSet(uint256 newFeeBps);
    event TreasurySet(address newTreasury);
    event MaxFeeBpsSet(uint256 newMaxFeeBps);
    event PairFeeBpsSet(bytes32 indexed pairKey, uint256 newFeeBps);
    event AdapterFeeBpsSet(address indexed adapter, uint256 newFeeBps);
    event UserDiscountBpsSet(address indexed user, uint256 newDiscountBps);

    // --- Constructor ---

    constructor(
        address initialOwner,
        address _treasury,
        uint256 _baseFeeBps,
        uint256 _maxFeeBps
    ) Ownable(initialOwner) {
        require(_treasury != address(0), "FeeController: Zero address treasury");
        require(_baseFeeBps <= _maxFeeBps, "FeeController: Base fee exceeds max fee");
        
        treasury = _treasury;
        baseFeeBps = _baseFeeBps;
        maxFeeBps = _maxFeeBps;

        emit TreasurySet(_treasury);
        emit BaseFeeBpsSet(_baseFeeBps);
        emit MaxFeeBpsSet(_maxFeeBps);
    }

    // --- Core Fee Logic ---

    /// @inheritdoc IFeeController
    function getSpotFee(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address adapter
    ) external view override returns (uint256 feeAmount, address feeRecipient) {
        uint256 effectiveFeeBps = _getEffectiveFeeBps(user, tokenIn, tokenOut, adapter);

        feeAmount = (amountIn * effectiveFeeBps) / 10_000;
        feeRecipient = treasury;

        return (feeAmount, feeRecipient);
    }

    // --- Internal Logic ---

    /// @dev Determines the final fee rate by checking overrides in order of priority: Adapter > Pair > Base.
    function _getEffectiveFeeBps(
        address user,
        address tokenIn,
        address tokenOut,
        address adapter
    ) internal view returns (uint256) {
        uint256 feeBps = baseFeeBps;

        // Fee override priority: Adapter > Pair > Base
        // A stored value of 0 means the override is not set.
        uint256 pairFee = pairFeeBps[_pairKey(tokenIn, tokenOut)];
        if (pairFee > 0) {
            feeBps = pairFee;
        }

        uint256 adapterFee = adapterFeeBps[adapter];
        if (adapterFee > 0) {
            feeBps = adapterFee;
        }
        
        require(feeBps <= maxFeeBps, "FeeController: Configured fee exceeds max fee");

        // Apply user-specific discount
        uint256 discount = userDiscountBps[user];
        if (discount >= feeBps) {
            return 0;
        }

        return feeBps - discount;
    }

    /// @dev Creates a canonical key for a token pair to ensure order doesn't matter.
    function _pairKey(address tokenA, address tokenB) internal pure returns (bytes32) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return keccak256(abi.encodePacked(token0, token1));
    }

    // --- Admin Functions ---

    function setBaseFeeBps(uint256 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= maxFeeBps, "FeeController: Base fee exceeds max fee");
        baseFeeBps = _newFeeBps;
        emit BaseFeeBpsSet(_newFeeBps);
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "FeeController: Zero address treasury");
        treasury = _newTreasury;
        emit TreasurySet(_newTreasury);
    }

    function setMaxFeeBps(uint256 _newMaxFeeBps) external onlyOwner {
        // Hard cap the max fee to 1% for safety.
        require(_newMaxFeeBps <= 100, "FeeController: Max fee cannot exceed 1%");
        maxFeeBps = _newMaxFeeBps;
        emit MaxFeeBpsSet(_newMaxFeeBps);
    }

    /// @notice Set a fee override for a specific token pair. Set to 0 to remove the override.
    function setPairFeeBps(address tokenA, address tokenB, uint256 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= maxFeeBps, "FeeController: Pair fee exceeds max fee");
        bytes32 key = _pairKey(tokenA, tokenB);
        pairFeeBps[key] = _newFeeBps;
        emit PairFeeBpsSet(key, _newFeeBps);
    }

    /// @notice Set a fee override for a specific adapter. Set to 0 to remove the override.
    function setAdapterFeeBps(address _adapter, uint256 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= maxFeeBps, "FeeController: Adapter fee exceeds max fee");
        adapterFeeBps[_adapter] = _newFeeBps;
        emit AdapterFeeBpsSet(_adapter, _newFeeBps);
    }

    /// @notice Set a fee discount for a specific user.
    function setUserDiscountBps(address _user, uint256 _newDiscountBps) external onlyOwner {
        require(_newDiscountBps <= maxFeeBps, "FeeController: Discount exceeds max fee");
        userDiscountBps[_user] = _newDiscountBps;
        emit UserDiscountBpsSet(_user, _newDiscountBps);
    }
}
