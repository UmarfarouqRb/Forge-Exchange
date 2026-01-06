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

/**
 * @title IntentSpotRouter
 * @author umarfarouqrb
 * @notice This contract is responsible for executing swaps based on user intents.
 * It integrates with a Vault for asset management and a FeeController for fee calculations.
 * The router supports multiple swap adapters to find the best execution price.
 */
contract IntentSpotRouter is Ownable, ReentrancyGuard, ISpotRouter, IntentVerifier {
    using SafeERC20 for IERC20;

    /// @dev Keccak256 hash of the EIP-712 SwapIntent type.
    bytes32 public constant SWAP_INTENT_TYPEHASH = keccak256(
        "SwapIntent(address user,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 deadline,uint256 nonce,address adapter,uint256 relayerFee)"
    );

    // --- Events ---

    /**
     * @dev Emitted when a new swap adapter is added to the router.
     * @param id The unique identifier for the adapter.
     * @param adapter The address of the new adapter.
     */
    event AdapterAdded(bytes32 indexed id, address indexed adapter);

    /**
     * @dev Emitted when a swap adapter is removed from the router.
     * @param id The unique identifier for the adapter.
     */
    event AdapterRemoved(bytes32 indexed id);

    /**
     * @dev Emitted when a swap is successfully executed.
     * @param user The address of the user who initiated the swap.
     * @param tokenIn The address of the input token.
     * @param tokenOut The address of the output token.
     * @param amountIn The amount of the input token.
     * @param amountOut The amount of the output token received.
     * @param protocolFee The fee paid to the protocol.
     * @param relayerFee The fee paid to the relayer.
     */
    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 protocolFee,
        uint256 relayerFee
    );

    /**
     * @dev Emitted when an intent is successfully filled.
     * @param intentHash The hash of the filled intent.
     * @param user The user who created the intent.
     * @param nonce The nonce of the intent.
     */
    event IntentFilled(bytes32 indexed intentHash, address indexed user, uint256 nonce);

    /**
     * @dev Emitted when an intent fails to be filled.
     * @param intentHash The hash of the failed intent.
     * @param user The user who created the intent.
     * @param reason The reason for the failure.
     */
    event IntentFailed(bytes32 indexed intentHash, address indexed user, string reason);
    
    /**
     * @dev Emitted when a swap fails to execute as expected.
     * @param tokenIn The input token address.
     * @param tokenOut The output token address.
     * @param amountIn The input amount.
     * @param adapterIds The list of adapters used for the swap attempt.
     * @param reason The reason for the failure.
     */
    event SwapFailed(address tokenIn, address tokenOut, uint256 amountIn, bytes32[] adapterIds, string reason);


    // --- State Variables ---

    /// @notice The vault used for asset management.
    VaultSpot public immutable vault;
    /// @notice The fee controller for calculating protocol fees.
    IFeeController public immutable feeController;
    /// @notice Mapping from adapter ID to adapter instance.
    mapping(bytes32 => IAdapter) public adapters;
    /// @notice Mapping to track whitelisted adapters.
    mapping(bytes32 => bool) public whitelistedAdapters;
    /// @notice Mapping from adapter address to adapter ID.
    mapping(address => bytes32) public adapterAddressToId;

    /**
     * @dev Sets up the contract with a vault, fee controller, and EIP-712 domain details.
     * @param _vault The address of the VaultSpot contract.
     * @param _feeController The address of the FeeController contract.
     * @param _name The EIP-712 domain name.
     * @param _version The EIP-712 domain version.
     */
    constructor(
        address _vault,
        address _feeController,
        string memory _name,
        string memory _version
    ) IntentVerifier(_name, _version) Ownable(msg.sender) {
        vault = VaultSpot(_vault);
        feeController = IFeeController(_feeController);
    }

    // --- Admin Functions ---

    /**
     * @dev Adds a new swap adapter to the router.
     * @notice Can only be called by the owner.
     * @param id The unique identifier for the adapter.
     * @param adapter The address of the new adapter contract.
     */
    function addAdapter(bytes32 id, address adapter) external onlyOwner {
        require(adapters[id] == IAdapter(address(0)), "Adapter already exists");
        require(adapterAddressToId[adapter] == bytes32(0), "Adapter address already registered");
        adapters[id] = IAdapter(adapter);
        adapterAddressToId[adapter] = id;
        whitelistedAdapters[id] = true;
        emit AdapterAdded(id, adapter);
    }

    /**
     * @dev Removes a swap adapter from the router.
     * @notice Can only be called by the owner.
     * @param id The unique identifier for the adapter to be removed.
     */
    function removeAdapter(bytes32 id) external onlyOwner {
        require(adapters[id] != IAdapter(address(0)), "Adapter does not exist");
        address adapterAddress = address(adapters[id]);
        delete adapterAddressToId[adapterAddress];
        delete adapters[id];
        delete whitelistedAdapters[id];
        emit AdapterRemoved(id);
    }

    // --- Relayer-Specific Swap Logic ---

    /**
     * @dev Executes a swap based on a signed user intent.
     * @notice This function is designed to be called by a relayer.
     * @param intent The SwapIntent struct containing swap details.
     * @param signature The EIP-712 signature of the intent.
     * @return amountOut The amount of the output token received.
     */
    function executeSwap(
        SwapIntent calldata intent,
        bytes calldata signature
    ) external nonReentrant returns (uint256 amountOut) {
        bytes32 intentHash = keccak256(abi.encode(intent));
        uint256 amountIn = intent.amountIn;
        if (amountIn == 0) {
            emit IntentFailed(intentHash, intent.user, "Input amount cannot be zero");
            return 0;
        }

        _checkDeadline(intent.deadline);

        address user = intent.user;
        uint256 nonce = intent.nonce;
        _useNonce(user, nonce);

        bytes32 structHash = keccak256(abi.encode(
            SWAP_INTENT_TYPEHASH,
            user,
            intent.tokenIn,
            intent.tokenOut,
            amountIn,
            intent.minAmountOut,
            intent.deadline,
            nonce,
            intent.adapter,
            intent.relayerFee
        ));

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(signer == user, "SpotRouter: Invalid signature");

        address adapterAddress = intent.adapter;
        bytes32 adapterId = adapterAddressToId[adapterAddress];
        require(whitelistedAdapters[adapterId], "Adapter not whitelisted");

        uint256 relayerFee = intent.relayerFee;
        uint256 amountInAfterRelayerFee = amountIn - relayerFee;

        (uint256 protocolFee, address feeRecipient) = feeController.getSpotFee(
            user,
            intent.tokenIn,
            intent.tokenOut,
            amountInAfterRelayerFee,
            adapterAddress
        );
        
        uint256 totalFee = relayerFee + protocolFee;
        require(amountIn >= totalFee, "Amount in is less than total fee");
        uint256 amountInAfterAllFees = amountIn - totalFee;

        address tokenIn = intent.tokenIn;
        vault.debit(user, tokenIn, amountIn);
        _pullTokensFromVault(tokenIn, amountIn);

        if (relayerFee > 0) {
            IERC20(tokenIn).safeTransfer(msg.sender, relayerFee);
        }
        if (protocolFee > 0) {
            IERC20(tokenIn).safeTransfer(feeRecipient, protocolFee);
        }

        IAdapter adapter = IAdapter(adapterAddress);
        IERC20(tokenIn).approve(address(adapter), amountInAfterAllFees);

        try adapter.swap(tokenIn, intent.tokenOut, amountInAfterAllFees, abi.encode(user)) returns (uint256 returnedAmount) {
            amountOut = returnedAmount;
        } catch (bytes memory reason) {
            emit IntentFailed(intentHash, user, string(reason));
            revert("Swap failed");
        }

        require(amountOut >= intent.minAmountOut, "SpotRouter: Slippage check failed");

        address tokenOut = intent.tokenOut;
        vault.credit(user, tokenOut, amountOut);

        emit Swap(user, tokenIn, tokenOut, amountIn, amountOut, protocolFee, relayerFee);
        emit IntentFilled(intentHash, user, nonce);
        return amountOut;
    }

    // --- Public Swap Logic ---

    /**
     * @dev Executes a swap for the message sender.
     * @notice This function allows users to directly interact with the router.
     * @param tokenIn The address of the input token.
     * @param tokenOut The address of the output token.
     * @param amountIn The amount of the input token.
     * @param adapterIds An array of adapter IDs to try for the swap.
     * @param data Additional data for the swap (flexible for different adapters).
     * @return amountOut The amount of the output token received.
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes32[] calldata adapterIds,
        bytes calldata data
    ) external nonReentrant returns (uint256 amountOut) {
        require(adapterIds.length > 0, "Must specify at least one adapter");

        address sender = msg.sender;
        (uint256 feeAmount, address feeRecipient) = feeController.getSpotFee(
            sender,
            tokenIn,
            tokenOut,
            amountIn,
            address(0)
        );

        uint256 amountInAfterFee = amountIn - feeAmount;

        vault.debit(sender, tokenIn, amountIn);
        _pullTokensFromVault(tokenIn, amountIn);

        if (feeAmount > 0) {
            IERC20(tokenIn).safeTransfer(feeRecipient, feeAmount);
        }

        amountOut = _executeSwap(tokenIn, tokenOut, amountInAfterFee, adapterIds, data);

        IERC20(tokenOut).safeTransfer(address(vault), amountOut);
        vault.credit(sender, tokenOut, amountOut);

        emit Swap(sender, tokenIn, tokenOut, amountIn, amountOut, feeAmount, 0);
        return amountOut;
    }

    // --- Internal Functions ---

    /**
     * @dev Internal function to execute a swap by trying multiple adapters.
     * @param tokenIn The input token.
     * @param tokenOut The output token.
     * @param amountIn The input amount.
     * @param adapterIds The IDs of the adapters to try.
     * @param data Additional data for the swap.
     * @return The amount of output tokens received.
     */
    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes32[] calldata adapterIds,
        bytes calldata data
    ) internal returns (uint256) {
        uint256 bestAmountOut = 0;
        IAdapter bestAdapter;

        for (uint i = 0; i < adapterIds.length; ++i) {
            bytes32 id = adapterIds[i];
            if (!whitelistedAdapters[id]) continue;

            IAdapter currentAdapter = adapters[id];
            try currentAdapter.quote(tokenIn, tokenOut, amountIn) returns (uint256 amount) {
                if (amount > bestAmountOut) {
                    bestAmountOut = amount;
                    bestAdapter = currentAdapter;
                }
            } catch {}
        }

        require(address(bestAdapter) != address(0), "No valid quote found");

        IERC20(tokenIn).approve(address(bestAdapter), amountIn);
        uint256 executedAmountOut = bestAdapter.swap(tokenIn, tokenOut, amountIn, data);
        
        if (executedAmountOut < bestAmountOut) {
            emit SwapFailed(tokenIn, tokenOut, amountIn, adapterIds, "Swap execution failed to meet quote");
        }
        require(executedAmountOut >= bestAmountOut, "Swap execution failed to meet quote");

        return executedAmountOut;
    }

    /**
     * @dev Pulls tokens from the vault to this contract.
     * @param token The token to pull.
     * @param amount The amount to pull.
     */
    function _pullTokensFromVault(address token, uint256 amount) internal {
        vault.approveToken(token, address(this), amount);
        IERC20(token).safeTransferFrom(address(vault), address(this), amount);
        vault.resetTokenApproval(token, address(this));
    }
}
