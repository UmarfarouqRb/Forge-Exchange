# Forge Exchange

Forge is a high-performance, decentralized exchange (DEX) platform built with a modern tech stack. It features a React-based frontend, a Node.js/Express backend (`relayer`), and Solidity smart contracts. Forge enables gasless trading through signed intents and supports WhatsApp integration via Privy session keys.

**Key Features:**
- ✅ **Gasless Trading**: Users sign intents, relayers execute for them
- ✅ **WhatsApp Integration**: Trade via WhatsApp with Privy session keys
- ✅ **Multi-DEX Routing**: Automatic best-price execution across multiple DEXs
- ✅ **Internal Settlement**: P2P or LP settlement with zero external swaps
- ✅ **Session Keys**: Spending-limited ephemeral keys for mobile/Privy users
- ✅ **EIP-712 Security**: Cryptographic signature validation for all trades

---

## 🚀 Getting Started

This guide will walk you through setting up the Forge Exchange project for local development and testing.

### Prerequisites

Before you begin, ensure you have the following installed on your system:
- [Node.js](https://nodejs.org/en/) (v18 or later recommended)
- [pnpm](https://pnpm.io/installation) (as a package manager)
- [Foundry](https://getfoundry.sh/) (for Solidity smart contract development and testing)

### 1. Installation

First, clone the repository to your local machine and install the required dependencies for all workspaces.

```bash
git clone <YOUR_REPOSITORY_URL>
cd forge-exchange
pnpm install
```

### 2. Supabase Setup

This project uses Supabase for its database. You will need to create a `.env` file in the `packages/database` directory with the following content:

```
SUPABASE_URL="YOUR_SUPABASE_URL"
SUPABASE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
```

Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_SERVICE_ROLE_KEY` with your actual Supabase credentials.

### 3. Privy Integration Setup (WhatsApp)

To enable WhatsApp trading, you need to configure Privy:

```
PRIVY_APP_ID="YOUR_PRIVY_APP_ID"
PRIVY_APP_SECRET="YOUR_PRIVY_APP_SECRET"
WHATSAPP_BOT_TOKEN="YOUR_WHATSAPP_BOT_TOKEN"
```

These credentials enable:
- User authentication via phone number
- Session key generation for WhatsApp transactions
- Spending limit management per session

### 4. Running the Development Environment

To run the full platform locally, you will need to run three separate processes in three different terminal windows: the blockchain, the backend relayer, and the frontend.

**Terminal 1: Start the Local Blockchain**

This command starts a local Anvil node, which is part of the Foundry toolset. It will also deploy your smart contracts.

```bash
pnpm run chain
```

**Terminal 2: Start the Backend Relayer**

This command starts the backend service that communicates with the smart contracts.

```bash
pnpm run dev:relayer
```

**Terminal 3: Start the Frontend Application**

This command starts the React frontend application.

```bash
pnpm run dev:frontend
```

After running these commands, you can access the frontend at `http://localhost:5173`.

### 5. Building for Production

To create an optimized production build of the applications:

**Build the Frontend:**
```bash
# This will create a 'dist' folder in 'apps/frontend'
pnpm run build:frontend
```

**Build the Relayer:**
```bash
# This will create a 'dist' folder in 'apps/relayer'
pnpm run build:relayer
```

### 6. Running Tests

The smart contracts are tested using Foundry's robust testing framework.

To run the full suite of tests for the Solidity contracts:

```bash
pnpm test
```

To run tests with verbose output:
```bash
pnpm test --verbose
```

To run a specific test:
```bash
pnpm test test/IntentSpotRouter.t.sol --match-path "*test_executeSwap*"
```

---

## 📋 Architecture Overview

### Core Contracts

#### VaultSpot: Protocol-Grade Custody & Accounting System

`VaultSpot.sol` is the central custody and accounting contract for the protocol. It is engineered for maximum security, transparency, and user protection. It holds all user assets in a non-custodial manner, tracking individual balances through an internal ledger.

**Core Architecture:**
- **Direct Ledger Accounting**: Uses `mapping(address => mapping(address => uint256))` to track user balances. This simple, direct approach avoids complex share calculations and makes the system transparent.
- **Emergency State Machine**: The contract operates in one of two states: `Normal` or `Emergency`. This allows administrators to instantly freeze all risky operations (deposits, swaps) in a crisis while ensuring users can always withdraw.
- **User Escape Hatch**: The `emergencyWithdraw` function guarantees users can always retrieve their funds. It is a purpose-built function with minimal external interactions, designed to work even if the system is compromised.

**Formal Invariant Checklist:**

**State Invariants (SI)**
- **SI-1 - Solvency**: The sum of all internal user balances for a given token must never exceed the total balance of that token held by this contract.
- **SI-2 - Positive Balances**: A user's internal balance of any token can never be negative.
- **SI-3 - Sole Custody**: Only the vault contract itself should custody user funds intended for trading.

**Execution Invariants (EI)**
- **EI-1 - Atomic Swaps**: Swaps must be atomic, with a user's balance being debited for the input token *before* the swap occurs and credited with the output token *after* the swap completes.
- **EI-2 - Slippage Protection**: The `SpotRouter` (not the vault) is responsible for ensuring that the final output amount of a swap is greater than or equal to a user-defined minimum.
- **EI-3 - Debit Precedes Credit**: The vault ensures that a user is debited before the router is approved to spend funds, and credited only after the swap is complete.

**Safety Properties (SP)**
- **SP-1 - Router Authority**: Only the designated `SpotRouter` contract can trigger debits, credits, or token approvals on behalf of users.
- **SP-2 - Admin Cannot Drain Funds**: The contract owner (admin) cannot directly access, transfer, or arbitrarily modify any user's funds or internal balances.
- **SP-3 - Unstoppable Emergency Exit**: Users can always withdraw their funds via `emergencyWithdraw` when the system is in emergency mode. This action cannot be blocked by the admin.

---

#### IntentSpotRouter: Gasless Swaps with Ultimate Security & Flexibility

`IntentSpotRouter.sol` is a powerful extension of the protocol's trading capabilities, designed to process off-chain cryptographic signatures that represent a user's "intent" to swap.

**Core Features:**

**1. Signed Intents**
Instead of calling a `swap` function directly, users sign a `SwapIntent` message off-chain using their private key. This message specifies:
- Input/output tokens and amounts
- Minimum acceptable output (slippage protection)
- Deadline for execution (prevents stale orders)
- Unique nonce (prevents replay attacks)
- Optional adapter preference
- Relayer fee (compensates executor)

**2. Multi-Path Execution**

When `executeSwap` is called with the user's intent and signature, it operates in one of two modes:

- **Best Price Mode (Default)**: If the user specifies `address(0)` as the adapter, the router automatically queries all whitelisted DEX adapters to find the best execution price.
- **Direct Route Mode (Advanced)**: If the user specifies a particular adapter address, the router executes the swap directly on the chosen DEX.
- **Internal Settlement**: For P2P trades or LP settlement, users can settle trades matched off-chain without touching external DEXs.

**3. Relayer Authorization**
- Relayers must be whitelisted by the admin before they can execute swaps (FIX #6)
- Prevents unauthorized relayers from front-running orders
- Each relayer earns `relayerFee` for execution

**4. Security Enhancements**

✅ **FIX #1**: Nonce consumed AFTER signature verification (prevents griefing)
✅ **FIX #2**: forceApprove for USDT-style tokens (handles non-standard ERC20s)
✅ **FIX #3**: Signature verification before nonce in settleTrade (consistent ordering)
✅ **FIX #5**: Zero amount validation upfront (prevents silent failures)
✅ **FIX #6**: Relayer whitelist authorization (prevents unauthorized execution)
✅ **FIX #7**: minAmountOut in public swap function (direct user slippage protection)
✅ **FIX #8**: EIP-712 digest in events (correct hash format for indexers)

---

#### 🆕 Session Keys: WhatsApp Trading Feature

**What are Session Keys?**

Session keys enable users to authorize spending limits without signing every transaction. Perfect for WhatsApp users who want frictionless mobile trading.

**How It Works:**

1. **Registration** (Privy/Frontend):
   ```solidity
   router.registerSessionKey(
       ephemeralAddress,      // Generated by Privy
       maxPerTransaction,     // e.g., 500 USDC
       totalSpendingLimit,    // e.g., 5000 USDC/month
       expiryTime,           // e.g., 30 days from now
       allowedTokens         // Optional: [USDC, WETH]
   )
   ```

2. **WhatsApp Command**:
   ```
   User: "Swap $200 USDC to ETH"
   WhatsApp Bot → Backend → Signs with session key → executeSwap()
   ```

3. **Spending Limits Enforced**:
   - Per-transaction max: `500 USDC`
   - Daily/monthly total: `5000 USDC`
   - Token whitelist: `[USDC, WETH, PAXG]`
   - Auto-expiry: `30 days`

4. **Revocation** (Anytime):
   ```solidity
   router.revokeSessionKey(sessionKeyAddress)
   ```

**Security Properties:**
- Session key can NEVER access user's vault directly
- Only authorizes spending, never controls custody
- Cryptographically verified with signature validation
- All limits enforced on-chain
- User's real wallet address stays secure
- If Privy backend goes down, user can still withdraw

**Integration Flow:**
```
Privy Frontend                      IntentSpotRouter                VaultSpot
    ↓                                   ↓                              ↓
User enables WhatsApp          Backend signs intents          Custody & balances
    ↓                                   ↓
registerSessionKey()           Session key validation
    ↓                                   ↓
[limits set]         ← ← ←    [limits enforced]
    ↓                                   ↓
WhatsApp bot                    executeSwap()
    ↓                                   ↓
User: "Swap $200"    ← → ←    Spends from vault
    ↓                                   ↓
Trade executed                  Funds to user
```

---

#### FeeController: Dynamic Protocol Fees

`FeeController.sol` manages fees with multiple override tiers:

**Fee Priority:**
1. **Adapter-specific fee** (highest priority)
2. **Pair-specific fee** (WETH ↔ USDC can differ from WETH ↔ DAI)
3. **Base protocol fee** (fallback)

**User Discounts:**
- VIP users can have reduced fees or free trading
- Applied after all tier lookups

**Hard Caps:**
- Maximum fee: `1%` (hard-coded, cannot be changed)
- Prevents runaway fee attacks

---

## 🔄 Complete Trade Flow

### External DEX Swap (Best Price)

```
1. User signs SwapIntent(WETH → USDC, 1 ETH, min 3000 USDC, adapter=0x0)

2. Relayer submits to executeSwap(intent, signature)

3. Router:
   ├─ Verifies relayer is authorized
   ├─ Checks amountIn > 0
   ├─ Verifies EIP-712 signature
   ├─ Consumes nonce (AFTER verification)
   ├─ Calculates fees (relayer + protocol)
   ├─ Debits user's WETH from vault
   ├─ Queries all adapters for best quote
   ├─ Executes swap via best adapter (forceApprove for USDT)
   ├─ Validates output >= minAmountOut
   └─ Credits user's USDC

4. Events emitted: Swap, IntentFilled
```

### Internal Settlement (P2P)

```
1. User A signs: WETH → USDC, 1 ETH, min 1950 USDC
2. User B (LP) has 2000 USDC in vault
3. Solver matches them off-chain
4. Relayer calls settleTrade(intentA, sigA, userB, 2000 USDC)

Router settles:
├─ Verifies signature & nonce (BEFORE consuming)
├─ Checks LP has 2000 USDC
├─ Debits User A: 1 ETH, Debits LP: 2000 USDC
├─ Credits User A: 2000 USDC, Credits LP: net WETH (after fees)
└─ Rewards relayer & treasury with fees
```

### WhatsApp via Session Key

```
User authorizes session key with limits:
├─ Max per transaction: 500 USDC
├─ Total monthly: 5000 USDC
├─ Expires: 30 days

User messages WhatsApp: "Swap $200 USDC to WETH"

Backend:
├─ Constructs SwapIntent
├─ Signs with session key (Privy API)
├─ Calls executeSwap(intent, sessionKeySig)

Router:
├─ Recovers signer = session key
├─ Calls _validateSessionKey()
├─ Verifies: expiry OK, amount ≤ 500, total ≤ 5000, token allowed
├─ Increments totalSpent
├─ Continues as normal swap
├─ Emits SessionKeySpend event
```

---

## 🧪 Testing

All new features and security fixes have comprehensive test coverage:

```bash
# All tests
pnpm test

# New security fixes
pnpm test --match-path "*test_executeSwap_invalidSignature*"
pnpm test --match-path "*test_executeSwap_zeroAmountIn*"
pnpm test --match-path "*test_executeSwap_relayerNotAuthorized*"

# New features
pnpm test --match-path "*test_registerSessionKey*"
pnpm test --match-path "*test_sessionKey_spendingLimit*"
pnpm test --match-path "*test_revokeSessionKey*"

# Slippage protection
pnpm test --match-path "*test_swap_slippageExceeded*"
```

---

## 🚨 Breaking Changes (Required Updates)

### Frontend
- **Old**: `router.swap(tokenIn, tokenOut, amountIn, adapterIds, data)`
- **New**: `router.swap(tokenIn, tokenOut, amountIn, minAmountOut, adapterIds, data)`

**Required**: Add `minAmountOut` parameter to direct user swap calls.

### Relayer/Backend
- Relayers must now be authorized before executing swaps:
  ```solidity
  router.authorizeRelayer(relayerAddress)
  ```

### Tests
- Update test setup to authorize relayers in `setUp()`

---

## 📚 Additional Resources

- **SECURITY_ANALYSIS.md**: Full security review with validation results
- **Design Guidelines**: See `design_guidelines.md`
- **Relayer Documentation**: See `apps/relayer/README.md`
- **Beta Features**: See `Beta.md`

---

## 🔗 Deployment

For production deployment, see `deployment/README.md` for:
- Contract addresses
- Configuration steps
- Gas optimization notes

---

## 👥 Contributing

When contributing, ensure:
1. All tests pass: `pnpm test`
2. Security invariants are maintained
3. No breaking changes without migration guide
4. Documentation is updated for new features

---

**Forge Exchange**: Enabling the future of decentralized trading, powered by intents and AI agents. 🚀
