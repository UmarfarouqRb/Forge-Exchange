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
 * Includes session key support for WhatsApp/Privy integration.
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
     * @param intentHash The EIP-712 digest of the filled intent.
     * @param user The user who created the intent.
     * @param nonce The nonce of the intent.
     */
    event IntentFilled(bytes32 indexed intentHash, address indexed user, uint256 nonce);

    /**
     * @dev Emitted when an intent fails to be filled.
     * @param intentHash The EIP-712 digest of the failed intent.
     * @param user The user who created the intent.
     * @param reason The reason for the failure.
     */
    event IntentFailed(bytes32 indexed intentHash, address indexed user, string reason);
    
    /**
     * @dev Emitted when a swap fails to execute as expected.
     * @param tokenIn The input token address.
     * @param tokenOut The output token address.
     * @param amountIn The input amount.
     * @param reason The reason for the failure.
     */
    event SwapFailed(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, string reason);

    /**
     * @dev Emitted when a relayer is authorized or revoked.
     * @param relayer The relayer address.
     * @param authorized Whether the relayer is now authorized.
     */
    event RelayerAuthorized(address indexed relayer, bool authorized);

    /**
     * @dev Emitted when a session key is registered.
     * @param owner The real user this key acts for.
     * @param sessionKey The ephemeral session key address.
     * @param maxAmountPerTx Max spend per single transaction.
     * @param spendingLimit Total lifetime spending cap.
     * @param expiry Unix timestamp when key expires.
     */
    event SessionKeyRegistered(
        address indexed owner,
        address indexed sessionKey,
        uint256 maxAmountPerTx,
        uint256 spendingLimit,
        uint256 expiry
    );

    /**
     * @dev Emitted when a session key is revoked.
     * @param owner The owner of the session key.
     * @param sessionKey The revoked session key address.
     */
    event SessionKeyRevoked(address indexed owner, address indexed sessionKey);

    /**
     * @dev Emitted when a session key is used for a transaction.
     * @param sessionKey The session key address.
     * @param owner The real owner.
     * @param amount The amount spent.
     * @param totalSpent The accumulated spend so far.
     * @param remainingLimit The remaining spending limit.
     */
    event SessionKeySpend(
        address indexed sessionKey,
        address indexed owner,
        uint256 amount,
        uint256 totalSpent,
        uint256 remainingLimit
    );

    // --- Session Key Types ---

    struct SessionKey {
        address owner;          // The real user this key acts for
        uint256 maxAmountPerTx; // Max spend per single transaction
        uint256 spendingLimit;  // Total lifetime spending cap
        uint256 totalSpent;     // Accumulated spend so far
        uint256 expiry;         // Unix timestamp when key expires
        bool active;
    }

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
    /// @notice Array of all adapter IDs for iteration.
    bytes32[] public allAdapters;
    /// @notice Mapping from adapter ID to its index in the allAdapters array.
    mapping(bytes32 => uint256) public adapterIdToIndex;

    /// @notice Authorized relayers registry.
    mapping(address => bool) public authorizedRelayers;

    /// @notice Session key address => session key data.
    mapping(address => SessionKey) public sessionKeys;
    /// @notice owner => list of their active session keys (for enumeration).
    mapping(address => address[]) public ownerSessionKeys;
    /// @notice owner => sessionKey => index in ownerSessionKeys.
    mapping(address => mapping(address => uint256)) private _sessionKeyIndex;
    /// @notice Per-session-key allowed tokens (empty mapping = all tokens allowed).
    mapping(address => mapping(address => bool)) public sessionKeyAllowedTokens;
    /// @notice Whether a session key has token restrictions.
    mapping(address => bool) public sessionKeyHasTokenRestrictions;

    /**
     * @dev Sets up the contract with a vault, fee controller, and EIP-712 domain details.
     * @param _vault The address of the VaultSpot contract.
     * @param _feeController The address of the FeeController contract.
     * @param _name The EIP-712 domain name.
     * @param _version The EIP-712 domain version.
     */
    constructor(
        address payable _vault,
        address _feeController,
        string memory _name,
        string memory _version
    ) IntentVerifier(_name, _version) Ownable(msg.sender) {
        vault = VaultSpot(_vault);
        feeController = IFeeController(_feeController);
    }

    // --- Admin Functions: Adapters ---

    /**
     * @dev Adds a new swap adapter to the router.
     * @notice Can only be called by the owner.
     * @param id The unique identifier for the adapter.
     * @param adapter The address of the new adapter contract.
     */
    function addAdapter(bytes32 id, address adapter) external onlyOwner {
        require(address(adapters[id]) == address(0), "Adapter already exists");
        require(adapterAddressToId[adapter] == bytes32(0), "Adapter address already registered");
        adapters[id] = IAdapter(adapter);
        adapterAddressToId[adapter] = id;
        whitelistedAdapters[id] = true;
        adapterIdToIndex[id] = allAdapters.length;
        allAdapters.push(id);
        emit AdapterAdded(id, adapter);
    }

    /**
     * @dev Removes a swap adapter from the router.
     * @notice Can only be called by the owner.
     * @param id The unique identifier for the adapter to be removed.
     */
    function removeAdapter(bytes32 id) external onlyOwner {
        require(address(adapters[id]) != address(0), "Adapter does not exist");
        address adapterAddress = address(adapters[id]);
        
        uint256 indexToRemove = adapterIdToIndex[id];
        bytes32 lastAdapterId = allAdapters[allAdapters.length - 1];
        
        allAdapters[indexToRemove] = lastAdapterId;
        adapterIdToIndex[lastAdapterId] = indexToRemove;
        
        allAdapters.pop();
        
        delete adapterIdToIndex[id];
        delete adapterAddressToId[adapterAddress];
        delete adapters[id];
        delete whitelistedAdapters[id];
        
        emit AdapterRemoved(id);
    }

    // --- Admin Functions: Relayers ---

    /**
     * @notice Authorize a relayer address.
     * @param relayer The relayer address to authorize.
     */
    function authorizeRelayer(address relayer) external onlyOwner {
        require(relayer != address(0), "Invalid relayer address");
        authorizedRelayers[relayer] = true;
        emit RelayerAuthorized(relayer, true);
    }

    /**
     * @notice Revoke a relayer's authorization.
     * @param relayer The relayer address to revoke.
     */
    function revokeRelayer(address relayer) external onlyOwner {
        authorizedRelayers[relayer] = false;
        emit RelayerAuthorized(relayer, false);
    }

    // --- Session Key Registration & Management ---

    /**
     * @notice Register a session key that can sign intents on behalf of msg.sender.
     * @dev Called by the user on the Xchange web frontend when setting up WhatsApp access.
     * @param sessionKey The ephemeral keypair address (generated by Privy client-side).
     * @param maxPerTx Max tokenIn amount per single transaction.
     * @param totalLimit Total lifetime spending cap for this session key.
     * @param expiry Unix timestamp after which the key is invalid.
     * @param allowedTokens Whitelist of tokenIn addresses. Empty array = all tokens allowed.
     */
    function registerSessionKey(
        address sessionKey,
        uint256 maxPerTx,
        uint256 totalLimit,
        uint256 expiry,
        address[] calldata allowedTokens
    ) external {
        require(sessionKey != address(0), "Invalid session key");
        require(!sessionKeys[sessionKey].active, "Session key already active");
        require(expiry > block.timestamp, "Expiry must be in the future");
        require(maxPerTx > 0 && totalLimit >= maxPerTx, "Invalid limits");

        sessionKeys[sessionKey] = SessionKey({
            owner: msg.sender,
            maxAmountPerTx: maxPerTx,
            spendingLimit: totalLimit,
            totalSpent: 0,
            expiry: expiry,
            active: true
        });

        // Store token restrictions if any
        if (allowedTokens.length > 0) {
            sessionKeyHasTokenRestrictions[sessionKey] = true;
            for (uint i = 0; i < allowedTokens.length; i++) {
                require(allowedTokens[i] != address(0), "Invalid token address");
                sessionKeyAllowedTokens[sessionKey][allowedTokens[i]] = true;
            }
        }

        _sessionKeyIndex[msg.sender][sessionKey] = ownerSessionKeys[msg.sender].length;
        ownerSessionKeys[msg.sender].push(sessionKey);

        emit SessionKeyRegistered(msg.sender, sessionKey, maxPerTx, totalLimit, expiry);
    }

    /**
     * @notice Revoke a session key. Can be called by the owner OR the session key itself.
     * @dev Privy calls this when the user logs out or changes WhatsApp spending limits.
     * @param sessionKey The session key to revoke.
     */
    function revokeSessionKey(address sessionKey) external {
        SessionKey storage sk = sessionKeys[sessionKey];
        require(sk.active, "Session key not active");
        require(
            msg.sender == sk.owner || msg.sender == sessionKey,
            "Not authorized to revoke"
        );

        address owner = sk.owner;
        sk.active = false;

        // Remove from owner's list
        uint256 idx = _sessionKeyIndex[owner][sessionKey];
        address[] storage keys = ownerSessionKeys[owner];
        address last = keys[keys.length - 1];
        keys[idx] = last;
        _sessionKeyIndex[owner][last] = idx;
        keys.pop();
        delete _sessionKeyIndex[owner][sessionKey];

        emit SessionKeyRevoked(owner, sessionKey);
    }

    /**
     * @notice Get all session keys for an owner.
     * @param owner The owner address.
     * @return Array of session key addresses.
     */
    function getOwnerSessionKeys(address owner) external view returns (address[] memory) {
        return ownerSessionKeys[owner];
    }

    // --- Session Key Validation ---

    /**
     * @notice Validate and record a session key spend.
     * @dev Returns the real owner if signer is a valid session key, 
     *      or address(0) if signer is not a session key (treat as direct user).
     * @param signer The signer address (could be session key or direct user).
     * @param tokenIn The input token being swapped.
     * @param amountIn The amount being spent.
     * @return owner The real owner if signer is a session key, address(0) otherwise.
     */
    function _validateSessionKey(
        address signer,
        address tokenIn,
        uint256 amountIn
    ) internal returns (address owner) {
        SessionKey storage sk = sessionKeys[signer];

        if (!sk.active) return address(0); // Not a session key

        require(block.timestamp < sk.expiry, "Session key expired");
        require(amountIn <= sk.maxAmountPerTx, "Exceeds session key per-tx limit");
        require(
            sk.totalSpent + amountIn <= sk.spendingLimit,
            "Exceeds session key total spending limit"
        );

        // Token restriction check
        if (sessionKeyHasTokenRestrictions[signer]) {
            require(
                sessionKeyAllowedTokens[signer][tokenIn],
                "Token not allowed for this session key"
            );
        }

        sk.totalSpent += amountIn;

        emit SessionKeySpend(
            signer,
            sk.owner,
            amountIn,
            sk.totalSpent,
            sk.spendingLimit - sk.totalSpent
        );

        return sk.owner;
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
        // FIX #6: Check relayer authorization
        require(authorizedRelayers[msg.sender], "Unauthorized relayer");

        // FIX #5: Validate input amount upfront
        require(intent.amountIn > 0, "Input amount cannot be zero");

        _checkDeadline(intent.deadline);

        address user = intent.user;
        uint256 nonce = intent.nonce;

        // FIX #1: Verify signature BEFORE consuming nonce
        bytes32 structHash = keccak256(abi.encode(
            SWAP_INTENT_TYPEHASH,
            user,
            intent.tokenIn,
            intent.tokenOut,
            intent.amountIn,
            intent.minAmountOut,
            intent.deadline,
            nonce,
            intent.adapter,
            intent.relayerFee
        ));

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        // Handle session keys
        if (signer != user) {
            address sessionOwner = _validateSessionKey(signer, intent.tokenIn, intent.amountIn);
            require(sessionOwner == user, "SpotRouter: Invalid signature or session key");
        }

        // FIX #1: Consume nonce AFTER verification
        _useNonce(user, nonce);
        
        uint256 relayerFee = intent.relayerFee;
        uint256 amountInAfterRelayerFee = intent.amountIn - relayerFee;

        (uint256 protocolFee, address feeRecipient) = feeController.getSpotFee(
            user,
            intent.tokenIn,
            intent.tokenOut,
            amountInAfterRelayerFee,
            intent.adapter
        );
        
        uint256 totalFee = relayerFee + protocolFee;
        require(intent.amountIn >= totalFee, "Amount in is less than total fee");
        uint256 amountInAfterAllFees = intent.amountIn - totalFee;

        address tokenIn = intent.tokenIn;
        vault.debit(user, tokenIn, intent.amountIn);
        _pullTokensFromVault(tokenIn, intent.amountIn);

        if (relayerFee > 0) {
            IERC20(tokenIn).safeTransfer(msg.sender, relayerFee);
        }
        if (protocolFee > 0) {
            IERC20(tokenIn).safeTransfer(feeRecipient, protocolFee);
        }

        if (intent.adapter != address(0)) {
            address adapterAddress = intent.adapter;
            bytes32 adapterId = adapterAddressToId[adapterAddress];
            require(whitelistedAdapters[adapterId], "Adapter not whitelisted");

            IAdapter adapter = IAdapter(adapterAddress);
            // FIX #2: Use forceApprove for USDT-style tokens
            IERC20(tokenIn).forceApprove(address(adapter), amountInAfterAllFees);

            try adapter.swap(tokenIn, intent.tokenOut, amountInAfterAllFees, abi.encode(user)) returns (uint256 returnedAmount) {
                amountOut = returnedAmount;
            } catch (bytes memory reason) {
                emit IntentFailed(digest, user, string(reason));
                revert("Swap failed");
            }
        } else {
            amountOut = _executeSwap(tokenIn, intent.tokenOut, amountInAfterAllFees, allAdapters, abi.encode(user));
        }
        
        // FIX #4: Use user's minAmountOut as the real boundary, not the quote
        require(amountOut >= intent.minAmountOut, "SpotRouter: Slippage check failed");

        address tokenOut = intent.tokenOut;
        vault.credit(user, tokenOut, amountOut);

        emit Swap(user, tokenIn, tokenOut, intent.amountIn, amountOut, protocolFee, relayerFee);
        emit IntentFilled(digest, user, nonce);
        return amountOut;
    }

    /**
     * @notice Settles a trade that was matched off-chain by a relayer.
     * @dev This is for internal settlement between a user and a counterparty (e.g., another user or LP).
     * The user's original signed intent is used for verification.
     * @param intent The user's original SwapIntent.
     * @param signature The user's EIP-712 signature for the intent.
     * @param counterparty The address of the party (e.g., LP or another user) settling the trade.
     * @param amountOut The final amount of tokenOut the user will receive, provided by the relayer.
     */
    function settleTrade(
        SwapIntent calldata intent,
        bytes calldata signature,
        address counterparty,
        uint256 amountOut
    ) external nonReentrant {
        bytes32 structHash = keccak256(abi.encode(
            SWAP_INTENT_TYPEHASH,
            intent.user,
            intent.tokenIn,
            intent.tokenOut,
            intent.amountIn,
            intent.minAmountOut,
            intent.deadline,
            intent.nonce,
            intent.adapter,
            intent.relayerFee
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        
        // --- VALIDATIONS ---
        require(intent.amountIn > 0, "Input amount cannot be zero");
        require(amountOut >= intent.minAmountOut, "Slippage check failed");
        _checkDeadline(intent.deadline);

        // FIX #3: Verify signature BEFORE consuming nonce
        address signer = ECDSA.recover(digest, signature);
        if (signer != intent.user) {
            address sessionOwner = _validateSessionKey(signer, intent.tokenIn, intent.amountIn);
            require(sessionOwner == intent.user, "Invalid signature or session key");
        }

        // FIX #3: Consume nonce AFTER signature verification
        _useNonce(intent.user, intent.nonce);

        // --- LIQUIDITY CHECK ---
        require(vault.balances(counterparty, intent.tokenOut) >= amountOut, "Insufficient liquidity");

        // --- FEES ---
        uint256 relayerFee = intent.relayerFee;
        (uint256 protocolFee, address feeRecipient) = feeController.getSpotFee(
            intent.user,
            intent.tokenIn,
            intent.tokenOut,
            intent.amountIn - relayerFee,
            address(0) // Internal settlement
        );
        uint256 totalFee = relayerFee + protocolFee;
        require(intent.amountIn >= totalFee, "Fee exceeds input amount");
        uint256 netAmountIn = intent.amountIn - totalFee;

        // --- INTERNAL SETTLEMENT ---
        vault.debit(intent.user, intent.tokenIn, intent.amountIn);
        vault.debit(counterparty, intent.tokenOut, amountOut);
        
        vault.credit(counterparty, intent.tokenIn, netAmountIn);
        vault.credit(intent.user, intent.tokenOut, amountOut);

        // --- FEE DISTRIBUTION ---
        if (relayerFee > 0) {
            vault.credit(msg.sender, intent.tokenIn, relayerFee);
        }
        if (protocolFee > 0) {
            vault.credit(feeRecipient, intent.tokenIn, protocolFee);
        }

        emit Swap(
            intent.user,
            intent.tokenIn,
            intent.tokenOut,
            intent.amountIn,
            amountOut,
            protocolFee,
            relayerFee
        );
        emit IntentFilled(digest, intent.user, intent.nonce);
    }

    // --- Public Swap Logic ---

    /**
     * @dev Executes a swap for the message sender.
     * @notice This function allows users to directly interact with the router.
     * @param tokenIn The address of the input token.
     * @param tokenOut The address of the output token.
     * @param amountIn The amount of the input token.
     * @param minAmountOut The minimum acceptable output amount.
     * @param adapterIds An array of adapter IDs to try for the swap.
     * @param data Additional data for the swap (flexible for different adapters).
     * @return amountOut The amount of the output token received.
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
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

        // FIX #7: Enforce minAmountOut check in public swap
        require(amountOut >= minAmountOut, "SpotRouter: Slippage exceeded");

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
        bytes32[] memory adapterIds,
        bytes memory data
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

        // FIX #2: Use forceApprove for USDT-style tokens
        IERC20(tokenIn).forceApprove(address(bestAdapter), amountIn);
        uint256 executedAmountOut = bestAdapter.swap(tokenIn, tokenOut, amountIn, data);
        
        if (executedAmountOut < bestAmountOut) {
            emit SwapFailed(tokenIn, tokenOut, amountIn, "Swap execution failed to meet quote");
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
