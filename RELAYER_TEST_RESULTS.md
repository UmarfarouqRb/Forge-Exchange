# Relayer Hardening: Status & Roadmap

This document outlines the current state of the relayer, the meaning of our recent test results, and the critical next steps for hardening the system for production.

---

## 1. What The Recent Test Results Mean

The successful integration test suite, run against a temporary SQLite database, is a significant milestone. It validates that:

*   ✅ **The core business logic is correct.**
*   ✅ **Intent validation and state transitions are consistent.**
*   ✅ **The end-to-end relayer flow is coherent.**

However, it is critical to understand the limitations:

> ⚠️ **Confidence in Logic, NOT Confidence in Production Execution.**
> 
> These tests do not yet validate production safety under real-world conditions (e.g., database concurrency, reorgs, high load).

---

## 2. Immediate Priority: Freeze Features, Harden Core

The immediate focus is now on **hardening**, not adding new features. The following steps are the highest priority.

### 🔴 Step 1: Introduce a DB Abstraction Layer (Critical)

To prepare for migration to a production database (PostgreSQL/Supabase) and improve testability, we must decouple the core logic from the database.

**Current State:**
`Relayer Core Logic` -> `Direct DB Calls (ORM)`

**Target State:**
`Relayer Core Logic` -> `Repository Interface` -> `PostgresRepo` / `SQLiteRepo`

This is the single most important architectural change to make next. It will prevent significant refactoring pain later.

### 🟡 Step 2: Add "Danger Tests"

We will expand our test suite to include failure-mode scenarios, even with the current SQLite setup. These tests are critical for demonstrating robustness.

*   **Duplicate nonce submissions**
*   **Double execution attempts**
*   **Expired intent execution**
*   **Invalid signature replays**
*   **Partial failure simulations**

### 🟢 Step 3: Restructure and Clarify Tests

To improve clarity and signal maturity, the test directory will be reorganized:

```
tests/
 ├─ unit/              # Pure logic tests, no DB
 │   ├─ intent.spec.ts
 │   ├─ fee.spec.ts
 │   └─ signature.spec.ts
 ├─ integration/       # End-to-end flow tests
 │   └─ relayer-flow.sqlite.spec.ts
 └─ postgres/          # (empty for now)
     └─ relayer-concurrency.postgres.spec.ts
```

---

## 3. High-Impact Hardening Features to Build Next

These features add critical runtime protections and observability. They do not require a Postgres database to be implemented.

### 🔥 Relayer Safety Guards

*   **Intent Idempotency:** Prevent the same intent from being processed twice.
*   **Reorg Tolerance:** A mechanism to detect and handle minor chain reorgs.
*   **Execution Retry Caps:** Limit how many times a failing transaction is retried.
*   **Gas Spike Protection:** Pause execution if gas prices exceed a safe threshold.
*   **Admin Kill Switch:** A mechanism to immediately pause all relayer execution.

### 🔥 Execution Observability

Implement structured logging for all critical state transitions. This is more important than the database choice at this stage.

**Log Fields:** `intent_hash`, `user`, `status_from`, `status_to`, `tx_hash`, `error_code`, `gas_used`

### 🔥 "Execution Guarantees" Document

Create a clear internal document outlining:
*   What the relayer guarantees (e.g., intent validity).
*   What it does NOT guarantee (e.g., execution in a specific block).
*   Known failure modes and their impact.
*   Emergency procedures (e.g., use of the kill switch).

---

## 4. The Path to Production

We will reintroduce PostgreSQL/Supabase when we are preparing for a **public testnet deployment**, onboarding external partners, or undergoing formal VC diligence.

Until then, SQLite remains an acceptable test harness for logic validation.

### VC Reality Check

If asked today, *"Are you production-ready?"*, the correct answer is:

> **"Our execution logic is validated via unit and integration tests. We are now hardening the system with production-grade safety guards and a database abstraction layer before public launch."**

This is a strong, honest, and mature answer that instills confidence.
