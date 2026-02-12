# Forge Exchange

Forge is a high-performance, decentralized exchange (DEX) platform built with a modern tech stack. It features a React-based frontend, a Node.js/Express backend (`relayer`), and Solidity smart contracts managed with Foundry.

---

##  Getting Started

This guide will walk you through setting up the Forge Exchange project for local development and testing.

### Prerequisites

Before you begin, ensure you have the following installed on your system:
- [Node.js](httpss://nodejs.org/en/) (v18 or later recommended)
- [pnpm](httpss://pnpm.io/installation) (as a package manager)
- [Foundry](httpss://getfoundry.sh/) (for Solidity smart contract development and testing)

### 1. Installation

First, clone the repository to your local machine and install the required dependencies for all workspaces.

bash
git clone <YOUR_REPOSITORY_URL>
cd forge-exchange
pnpm install


### 2. Supabase Setup

This project uses Supabase for its database. You will need to create a `.env` file in the `packages/database` directory with the following content:


SUPABASE_URL="YOUR_SUPABASE_URL"
SUPABASE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"


Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_SERVICE_ROLE_KEY` with your actual Supabase credentials.

### 3. Running the Development Environment

To run the full platform locally, you will need to run three separate processes in three different terminal windows: the blockchain, the backend relayer, and the frontend.

Terminal 1: Start the Local Blockchain

This command starts a local Anvil node, which is part of the Foundry toolset. It will also deploy your smart contracts.

bash
pnpm run chain


Terminal 2: Start the Backend Relayer

This command starts the backend service that communicates with the smart contracts.

bash
pnpm run dev:relayer


Terminal 3: Start the Frontend Application

This command starts the React frontend application.

bash
pnpm run dev:frontend


After running these commands, you can access the frontend at `http://localhost:5173`.

### 4. Building for Production

To create an optimized production build of the applications:

Build the Frontend:
bash
# This will create a 'dist' folder in 'apps/frontend'
pnpm run build:frontend


Build the Relayer:
bash
# This will create a 'dist' folder in 'apps/relayer'
pnpm run build:relayer


### 5. Running Tests

The smart contracts are tested using Foundry's robust testing framework.

To run the full suite of tests for the Solidity contracts:

bash
pnpm test


---

VaultSpot: Protocol-Grade Custody & Accounting System

## Overview

`VaultSpot.sol` is the central custody and accounting contract for the protocol. It is engineered for maximum security, transparency, and user protection. It holds all user assets in a non-custodial manner, tracking individual balances through a direct 1-to-1 internal ledger. The design is built on a foundation of formal, auditable invariants and includes a robust emergency state machine to guarantee user fund safety at all times.

## Core Architecture

-Direct Ledger Accounting: The vault uses a `mapping(address => mapping(address => uint256))` to track user balances. This simple, direct approach avoids complex share calculations and makes the system inherently immune to common DeFi exploits like inflation attacks.

-Emergency State Machine: The contract operates in one of two states: `Normal` or `Emergency`. This allows administrators to instantly freeze all risky operations (deposits, swaps) in a crisis while always leaving a secure exit path open for users.

-User Escape Hatch: The `emergencyWithdraw` function guarantees users can always retrieve their funds. It is a purpose-built function with minimal external interactions, designed to work even if other parts of the protocol (like the router or DEXs) are compromised.

## Formal Invariant Checklist

This checklist defines the core safety guarantees of the vault. These properties are rigorously enforced by the contracts design and are the primary focus of audits and formal verification.

--- 

### State Invariants (SI)
Properties that must always hold for the contract's state.

- SI-1: Solvency: The sum of all internal user balances for a given token must never exceed the total balance of that token held by this contract.
- SI-2: Positive Balances:** A user's internal balance of any token can never be negative.
- SI-3: Sole Custody:** Only the vault contract itself should custody user funds intended for trading.

### Execution Invariants (EI)
*Guarantees about how specific functions must execute.*

-EI-1: Atomic Swaps:** Swaps must be atomic, with a user's balance being debited for the input token *before* the swap occurs and credited with the output token *after* the swap completes.
- **EI-2: Slippage Protection:** The `SpotRouter` (not the vault) is responsible for ensuring that the final output amount of a swap is greater than or equal to a user-defined minimum.
- **EI-3: Debit Precedes Credit:** The vault ensures that a user is debited before the router is approved to spend funds, and credited only after the swap is complete.

### Safety Properties (SP)
*Rules governing permissions and access control.*

- **SP-1: Router Authority:** Only the designated `SpotRouter` contract can trigger debits, credits, or token approvals on behalf of users.
- **SP-2: Admin Cannot Drain Funds:** The contract owner (admin) cannot directly access, transfer, or arbitrarily modify any user's funds or internal balances.
- **SP-3: Unstoppable Emergency Exit:** Users can always withdraw their funds via `emergencyWithdraw` when the system is in emergency mode. This action cannot be blocked by the admin.

## IntentSpotRouter: Gasless Swaps with Ultimate Security & Flexibility

### Overview

The `IntentSpotRouter.sol` contract is a powerful extension of the protocol's trading capabilities, designed to process off-chain cryptographic signatures that represent a user's "intent" to swap. This enables a gas-less experience for the end-user, as a third-party "relayer" can submit the transaction on their behalf. The router is engineered with a novel security mechanism to find the best price while completely neutralizing the risk of relayer manipulation.

### Core Architecture

- **Signed Intents**: Instead of calling a `swap` function directly, users sign a `SwapIntent` message off-chain using their private key. This message specifies *what* they want to trade (e.g., "swap 1 WETH for at least 3000 USDC"), their deadline, and a unique nonce.

- **Relayer-Proof Security through Hashing**: The router's most critical security feature is how it validates signatures. When generating the hash that a user signs, the contract deliberately uses `address(0)` as a placeholder for the DEX adapter. This means the user's signature authorizes the *trade itself*, but not *where* it executes. A relayer cannot alter the signature to force the trade through a specific, less-favorable DEX to extract value.

- **Dual-Mode Execution**: When `executeSwap` is called with the user's intent and signature, it operates in one of two modes:
    1.  **Best Price Mode (Default)**: If the user specifies `address(0)` as the adapter in their intent, the router will automatically query all whitelisted DEX adapters to find the one offering the best real-time `quote`. It then executes the trade on that optimal route, ensuring the user gets the best possible price at the moment of execution.
    2.  **Direct Route Mode (Advanced)**: If the user specifies a particular adapter address in their intent, the router will honor that choice and execute the swap directly on the chosen DEX, bypassing the price-finding logic.

This dual-mode system provides both maximum security and flexibility, making it a highly advanced and user-centric routing mechanism.

## The Relayer: A Trust-Minimized Executor

The relayer is a crucial, yet untrusted, component of the gasless transaction architecture. Its primary role is to monitor for new, profitable `SignedIntent` messages off-chain and submit them to the `IntentSpotRouter` for on-chain execution.

### Key Responsibilities and Restrictions:

- **Transaction Submission:** The relayer pays the gas fee to call the `executeSwap` function, effectively acting as the transaction executor on behalf of the user.
- **Zero-Control Execution:** The relayer has no ability to influence the outcome of the trade. The `IntentSpotRouter` contract's validation logic ensures the relayer cannot:
    - Alter the swap's parameters (tokens, amounts, user).
    - Choose a self-serving or malicious DEX adapter.
    - Execute an expired or already used intent.
- **Economic Incentive:** The relayer is motivated by the `relayerFee` embedded within the `SignedIntent`. This fee, which is authorized by the user's signature, is the relayer's compensation for paying the gas and providing the execution service.

This design creates a powerful and secure system where users can enjoy a gas-free experience without needing to trust the relayer. The user's security is guaranteed by the immutable logic of the smart contract.

# SpotRouter: A Resilient and Intelligent DeFi Aggregator

## Overview

The `SpotRouter` is a sophisticated and resilient DeFi aggregator designed to provide users with the best possible swap rates by intelligently routing trades through a variety of decentralized exchanges (DEXs). The `SpotRouter` is built with a fallback mechanism that ensures a high level of reliability, even in the event of a single liquidity source becoming unavailable.

## Core Logic and Functionality

The `SpotRouter`'s core logic is centered around the `swap` function. This function takes in the input token, output token, input amount, and a list of adapters to use for the swap. The `SpotRouter` then iterates through the adapters, gets a quote from each one, and executes the swap on the adapter that provides the best quote.

### Fallback Mechanism

A key feature of the `SpotRouter` is its fallback mechanism. If an adapter fails to provide a quote or execute a swap, the `SpotRouter` will gracefully handle the error and move on to the next adapter in the list. This ensures that the user's swap will not fail if a single liquidity source is unavailable.

### Intelligent Adapters

The `SpotRouter` interacts with DEXs through a system of intelligent adapters. Each adapter is responsible for handling the specific implementation details of a single DEX. This modular design allows for new DEXs to be easily integrated into the `SpotRouter` without requiring any changes to the core logic.

#### PancakeV3Adapter

The `PancakeV3Adapter` is designed to interact with the PancakeSwap V3 DEX. The adapter intelligently iterates through all of the available fee tiers to find the best possible quote for a given swap. This ensures that the user always gets the best possible rate, regardless of the liquidity distribution on the DEX.

#### AerodromeAdapter

The `AerodromeAdapter` is designed to interact with the Aerodrome DEX. The adapter is capable of handling both stable and volatile swaps, making it a versatile tool for routing trades through the Aerodrome ecosystem.

## Swap Details from the `EdgeCaseTest`

### cbBTC to WETH Swap

*   **Input Token:** cbBTC
*   **Output Token:** WETH
*   **Input Amount:** 1 cbBTC
*   **Adapter Used:** Aerodrome
*   **Total Amount Out (WETH):** 27
*   **Amount to User (WETH):** 27
*   **Fee Collected (WETH):** 0

### USDC to AERO Swaps (Aerodrome)

*   **Swap for 5 USDC:**
    *   **Amount to User:** 9 AERO
    *   **Fee Collected:** 0
*   **Swap for 10 USDC:**
    *   **Amount to User:** 18 AERO
    *   **Fee Collected:** 0
*   **Swap for 100 USDC:**
    *   **Amount to User:** 185 AERO
    *   **Fee Collected:** 0
*   **Swap for 150 USDC:**
    *   **Amount to User:** 278 AERO
    *   **Fee Collected:** 0

### USDC to DAI Swaps (Aerodrome Stable)

*   **Swap for 5 USDC:**
    *   **Amount to User:** 4 DAI
    *   **Fee Collected:** 0
*   **Swap for 10 USDC:**
    *   **Amount to User:** 9 DAI
    *   **Fee Collected:** 0
*   **Swap for 100 USDC:**
    *   **Amount to User:** 99 DAI
    *   **Fee Collected:** 0
*   **Swap for 150 USDC:**
    *   **Amount to User:** 149 DAI
    *   **Fee Collected:** 0

### USDC to SOL Swaps (Multi-DEX)

*   **Swap for 5 USDC:**
    *   **Amount to User:** 0 SOL
    *   **Fee Collected:** 0
*   **Swap for 10 USDC:**
    *   **Amount to User:** 0 SOL
    *   **Fee Collected:** 0
*   **Swap for 100 USDC:**
    *   **Amount to User:** 0 SOL
    *   **Fee Collected:** 0
*   **Swap for 150 USDC:**
    *   **Amount to User:** 1 SOL
    *   **Fee Collected:** 0

### USDC to TRUMP Swaps (Multi-DEX)

*   Swap for 5 USDC:
    *   Amount to User: 0 TRUMP
    *   **Fee Collected:** 0
*   **Swap for 10 USDC:**
    *   **Amount to User:** 1 TRUMP
    *   **Fee Collected:** 0
*   **Swap for 100 USDC:**
    *   **Amount to User:** 6 TRUMP
    *   **Fee Collected:** 0
*   **Swap for 150 USDC:**
    *   **Amount to User:** 4 TRUMP
    *   **Fee Collected:** 0
