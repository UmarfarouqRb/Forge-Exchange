# VaultSpot: Protocol-Grade Custody & Accounting System

## Overview

`VaultSpot.sol` is the central custody and accounting contract for the protocol. It is engineered for maximum security, transparency, and user protection. It holds all user assets in a non-custodial manner, tracking individual balances through a direct 1-to-1 internal ledger. The design is built on a foundation of formal, auditable invariants and includes a robust emergency state machine to guarantee user fund safety at all times.

## Core Architecture

- **Direct Ledger Accounting:** The vault uses a `mapping(address => mapping(address => uint256))` to track user balances. This simple, direct approach avoids complex share calculations and makes the system inherently immune to common DeFi exploits like inflation attacks.

- **Emergency State Machine:** The contract operates in one of two states: `Normal` or `Emergency`. This allows administrators to instantly freeze all risky operations (deposits, swaps) in a crisis while always leaving a secure exit path open for users.

- **User Escape Hatch:** The `emergencyWithdraw` function guarantees users can always retrieve their funds. It is a purpose-built function with minimal external interactions, designed to work even if other parts of the protocol (like the router or DEXs) are compromised.

## Formal Invariant Checklist

This checklist defines the core safety guarantees of the vault. These properties are rigorously enforced by the contract'''s design and are the primary focus of audits and formal verification.

--- 

### State Invariants (SI)
*Properties that must always hold for the contract'''s state.*

- **SI-1: Solvency:** The sum of all internal user balances for a given token must never exceed the total balance of that token held by this contract.
- **SI-2: Positive Balances:** A user'''s internal balance of any token can never be negative.
- **SI-3: Sole Custody:** Only the vault contract itself should custody user funds intended for trading.

### Execution Invariants (EI)
*Guarantees about how specific functions must execute.*

- **EI-1: Atomic Swaps:** Swaps must be atomic, with a user'''s balance being debited for the input token *before* the swap occurs and credited with the output token *after* the swap completes.
- **EI-2: Slippage Protection:** The `SpotRouter` (not the vault) is responsible for ensuring that the final output amount of a swap is greater than or equal to a user-defined minimum.
- **EI-3: Debit Precedes Credit:** The vault ensures that a user is debited before the router is approved to spend funds, and credited only after the swap is complete.

### Safety Properties (SP)
*Rules governing permissions and access control.*

- **SP-1: Router Authority:** Only the designated `SpotRouter` contract can trigger debits, credits, or token approvals on behalf of users.
- **SP-2: Admin Cannot Drain Funds:** The contract owner (admin) cannot directly access, transfer, or arbitrarily modify any user'''s funds or internal balances.
- **SP-3: Unstoppable Emergency Exit:** Users can always withdraw their funds via `emergencyWithdraw` when the system is in emergency mode. This action cannot be blocked by the admin.

