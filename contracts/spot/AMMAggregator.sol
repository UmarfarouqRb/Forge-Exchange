// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Aggregator that routes swaps across multiple adapters (UniswapV2/UniV3/PancakeV3/Aerodrome)
/// @dev Adapters implement IAdapter and are registered by admin. The aggregator does NOT pull tokens itself;
///      SpotRouter should handle token transfer to aggregator or adapters as appropriate (or adapters should pull).
import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "./interfaces/IAdapter.sol";

contract AMMAggregator is Ownable {
    event AdapterRegistered(string id, address adapter);
    event AdapterUnregistered(string id);
    event BestQuote(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 bestOut, string adapterId);

    mapping(string => address) public adapters; // id -> adapter contract
    string[] public adapterList;

    constructor(address initialOwner) Ownable(initialOwner) {}

    /* ========== ADMIN ========== */

    function registerAdapter(string memory id, address adapter) external onlyOwner {
        require(adapter != address(0), "AMMAgg: zero adapter");
        require(adapters[id] == address(0), "AMMAgg: id exists");
        adapters[id] = adapter;
        adapterList.push(id);
        emit AdapterRegistered(id, adapter);
    }

    function unregisterAdapter(string memory id) external onlyOwner {
        address a = adapters[id];
        require(a != address(0), "AMMAgg: not exist");
        adapters[id] = address(0);
        // remove from adapterList (cheap linear search ok: admin operation)
        for (uint256 i = 0; i < adapterList.length; i++) {
            if (keccak256(abi.encodePacked(adapterList[i])) == keccak256(abi.encodePacked(id))) {
                adapterList[i] = adapterList[adapterList.length - 1];
                adapterList.pop();
                break;
            }
        }
        emit AdapterUnregistered(id);
    }

    function getAdapters() external view returns (string[] memory) {
        return adapterList;
    }

    /* ========== QUOTE / ROUTING ========== */

    /// @notice Query adapters for the best amountOut given amountIn
    /// @dev Iterates registered adapters and calls quote. Some adapters may return 0.
    function bestQuote(address tokenIn, address tokenOut, uint256 amountIn) public returns (uint256 bestOut, string memory bestAdapterId) {
        uint256 best = 0;
        string memory bestId = "";
        for (uint256 i = 0; i < adapterList.length; i++) {
            string memory id = adapterList[i];
            address adapter = adapters[id];
            if (adapter == address(0)) continue;
            uint256 out;
            // try/catch to avoid revert propagation from non-compatible adapters
            try IAdapter(adapter).quote(tokenIn, tokenOut, amountIn) returns (uint256 amtOut) {
                out = amtOut;
            } catch {
                out = 0;
            }
            if (out > best) {
                best = out;
                bestId = id;
            }
        }
        return (best, bestId);
    }

    /// @notice Execute swap via a specific adapter id. Returns amountOut.
    /// @dev Caller must ensure token transfers/approvals as per adapter expectations.
    function swapViaAdapter(string memory adapterId, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, bytes calldata data) external returns (uint256 amountOut) {
        address adapter = adapters[adapterId];
        require(adapter != address(0), "AMMAgg: adapter not found");
        // Forward call to adapter
        amountOut = IAdapter(adapter).swap(tokenIn, tokenOut, amountIn, minAmountOut, data);
        return amountOut;
    }

    /// @notice Convenience: pick best adapter and execute
    function swapBest(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, bytes calldata data) external returns (uint256 amountOut, string memory usedAdapter) {
        (uint256 bestOut, string memory bestId) = bestQuote(tokenIn, tokenOut, amountIn);
        require(bytes(bestId).length > 0, "AMMAgg: no route");
        // Emit a hint for off-chain logging
        emit BestQuote(tokenIn, tokenOut, amountIn, bestOut, bestId);
        usedAdapter = bestId;
        amountOut = IAdapter(adapters[bestId]).swap(tokenIn, tokenOut, amountIn, minAmountOut, data);
    }
}
