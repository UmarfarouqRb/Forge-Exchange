// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// --- Original Imports (Preserved) ---
import {IERC20} from "@openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin-contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin-contracts/utils/ReentrancyGuard.sol";
import {IAdapter} from "./interfaces/IAdapter.sol";
import {VaultSpot} from "./VaultSpot.sol";
import {FeeController, IFeeController} from "./FeeController.sol";

// --- New Imports ---
import {ISpotRouter} from "./interfaces/ISpotRouter.sol";
import {IntentVerifier} from "../common/IntentVerifier.sol";
import {ECDSA} from "@openzeppelin-contracts/utils/cryptography/ECDSA.sol";

contract IntentSpotRouter is Ownable, ReentrancyGuard, ISpotRouter, IntentVerifier {
    using SafeERC20 for IERC20;

    /// @dev Keccak256 hash of the EIP-712 SwapIntent type.
    bytes32 public constant SWAP_INTENT_TYPEHASH = keccak256(
        "SwapIntent(address user,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 deadline,uint256 nonce,address adapter)"
    );

    // --- Events ---
    event AdapterAdded(bytes32 indexed id, address indexed adapter);
    event AdapterRemoved(bytes32 indexed id);
    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 protocolFee,
        uint256 relayerFee
    );

    // --- State Variables ---
    VaultSpot public immutable vault;
    IFeeController public immutable feeController;
    mapping(bytes32 => IAdapter) public adapters;
    mapping(bytes32 => bool) public whitelistedAdapters;
    mapping(address => bytes32) public adapterAddressToId; // New mapping for address-based lookup

    constructor(
        address _vault,
        address _feeController,
        string memory _name,
        string memory _version
    ) IntentVerifier(_name, _version) Ownable(msg.sender) {
        vault = VaultSpot(_vault);
        feeController = IFeeController(_feeController);
    }

    // --- Admin Functions (Augmented) ---
    function addAdapter(bytes32 id, address adapter) external onlyOwner {
        require(adapters[id] == IAdapter(address(0)), "Adapter already exists");
        require(adapterAddressToId[adapter] == bytes32(0), "Adapter address already registered");
        adapters[id] = IAdapter(adapter);
        adapterAddressToId[adapter] = id;
        whitelistedAdapters[id] = true;
        emit AdapterAdded(id, adapter);
    }

    function removeAdapter(bytes32 id) external onlyOwner {
        require(adapters[id] != IAdapter(address(0)), "Adapter does not exist");
        address adapterAddress = address(adapters[id]);
        delete adapterAddressToId[adapterAddress];
        delete adapters[id];
        delete whitelistedAdapters[id];
        emit AdapterRemoved(id);
    }

    // --- Relayer-Specific Swap Logic (New) ---
    function executeSwap(
        SwapIntent calldata intent,
        bytes calldata signature
    ) external nonReentrant returns (uint256 amountOut) {
        if (intent.amountIn == 0) {
            return 0;
        }
        _checkDeadline(intent.deadline);
        _useNonce(intent.user, intent.nonce);

        bytes32 structHash = keccak256(abi.encode(
            SWAP_INTENT_TYPEHASH,
            intent.user,
            intent.tokenIn,
            intent.tokenOut,
            intent.amountIn,
            intent.minAmountOut,
            intent.deadline,
            intent.nonce,
            intent.adapter
        ));

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(signer == intent.user, "SpotRouter: Invalid signature");

        bytes32 adapterId = adapterAddressToId[intent.adapter];
        require(whitelistedAdapters[adapterId], "Adapter not whitelisted");

        (uint256 feeAmount, address feeRecipient) = feeController.getSpotFee(
            intent.user,
            intent.tokenIn,
            intent.tokenOut,
            intent.amountIn,
            intent.adapter
        );

        uint256 amountInAfterFee = intent.amountIn - feeAmount;

        vault.debit(intent.user, intent.tokenIn, intent.amountIn);

        if (feeAmount > 0) {
            _pullTokensFromVault(intent.tokenIn, feeAmount);
            IERC20(intent.tokenIn).safeTransfer(feeRecipient, feeAmount);
        }

        _pullTokensFromVault(intent.tokenIn, amountInAfterFee);

        IAdapter adapter = IAdapter(intent.adapter);
        IERC20(intent.tokenIn).approve(address(adapter), amountInAfterFee);

        amountOut = adapter.swap(intent.tokenIn, intent.tokenOut, amountInAfterFee, abi.encode(intent.user));

        require(amountOut >= intent.minAmountOut, "SpotRouter: Slippage check failed");

        vault.credit(intent.user, intent.tokenOut, amountOut);

        emit Swap(intent.user, intent.tokenIn, intent.tokenOut, intent.amountIn, amountOut, feeAmount, 0);
        return amountOut;
    }

    // --- Public Swap Logic (Original, Preserved) ---
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes32[] calldata adapterIds,
        bytes calldata data
    ) external nonReentrant returns (uint256 amountOut) {
        require(adapterIds.length > 0, "Must specify at least one adapter");

        (uint256 feeAmount, address feeRecipient) = feeController.getSpotFee(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            address(0) // Adapter is not known at this point
        );

        uint256 amountInAfterFee = amountIn - feeAmount;

        vault.debit(msg.sender, tokenIn, amountIn);
        _pullTokensFromVault(tokenIn, amountInAfterFee);

        if (feeAmount > 0) {
            _pullTokensFromVault(tokenIn, feeAmount);
            IERC20(tokenIn).safeTransfer(feeRecipient, feeAmount);
        }

        amountOut = _executeSwap(tokenIn, tokenOut, amountInAfterFee, adapterIds, data);

        IERC20(tokenOut).safeTransfer(address(vault), amountOut);
        vault.credit(msg.sender, tokenOut, amountOut);

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, feeAmount, 0);
        return amountOut;
    }

    // --- Internal Swap Execution with Fallback (Original, Preserved) ---
    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes32[] calldata adapterIds,
        bytes calldata data
    ) internal returns (uint256) {
        uint256 bestAmountOut = 0;
        bytes32 bestAdapterId;

        for (uint i = 0; i < adapterIds.length; ++i) {
            bytes32 id = adapterIds[i];
            if (!whitelistedAdapters[id]) continue;

            try adapters[id].quote(tokenIn, tokenOut, amountIn) returns (uint256 amount) {
                if (amount > bestAmountOut) {
                    bestAmountOut = amount;
                    bestAdapterId = id;
                }
            } catch {}
        }

        require(bestAmountOut > 0, "No valid quote found");

        IAdapter bestAdapter = adapters[bestAdapterId];
        IERC20(tokenIn).approve(address(bestAdapter), amountIn);
        uint256 executedAmountOut = bestAdapter.swap(tokenIn, tokenOut, amountIn, data);
        
        require(executedAmountOut >= bestAmountOut, "Swap execution failed to meet quote");

        return executedAmountOut;
    }

    // --- Internal Helper Functions (Original, Preserved) ---
    function _pullTokensFromVault(address token, uint256 amount) internal {
        vault.approveToken(token, address(this), amount);
        IERC20(token).safeTransferFrom(address(vault), address(this), amount);
        vault.resetTokenApproval(token, address(this));
    }
}
