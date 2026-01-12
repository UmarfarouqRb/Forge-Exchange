# Forge Exchange Documentation

Welcome to the official documentation for Forge Exchange, a high-performance, decentralized exchange (DEX) platform.

This documentation is divided into two main sections:

*   [**User Guide**](./user-guide.md): For traders and end-users of the Forge Exchange platform.
*   [**Developer Guide**](./developer-guide.md): For developers who want to build on or contribute to the Forge Exchange protocol.

---

## User Guide

### Introduction to Forge Exchange

Forge is a professional CEX-style decentralized cryptocurrency exchange with multi-chain support. Users can trade crypto without KYC by connecting their Web3 wallet (e.g., MetaMask). The platform features a modern dark theme with gradient accents, TradingView integration for live market data, and full mobile responsiveness.

### Getting Started

1.  **Connect Your Wallet**: Click the "Connect Wallet" button and approve the connection in your MetaMask wallet.
2.  **Select a Chain**: Use the dropdown menu to select your desired blockchain network.
3.  **Explore the Platform**: Navigate between the Home, Market, Spot, Futures, and Assets pages.

### Trading

*   **Spot Trading**: Instantly buy or sell cryptocurrencies at the current market price.
*   **Limit Orders**: Place orders to buy or sell at a specific price.
*   **Futures Trading**: Trade perpetual contracts with leverage.

### Assets

*   **View Your Balances**: See an overview of your token balances.
*   **Deposit and Withdraw**: Transfer funds to and from the exchange.
*   **Transaction History**: Track the status of your deposits, withdrawals, and trades.

---

## Developer Guide

### Introduction

This guide provides a technical overview of the Forge Exchange architecture, including the smart contracts, relayer, and frontend.

### Getting Started

1.  **Prerequisites**: Node.js (v18+), pnpm, and Foundry.
2.  **Installation**: `git clone <YOUR_REPOSITORY_URL>`, `cd forge-exchange`, `pnpm install`.
3.  **Supabase Setup**: Create a `.env` file in `packages/database` with your Supabase credentials.
4.  **Run the Environment**:
    *   `pnpm run chain`
    *   `pnpm run dev:relayer`
    *   `pnpm run dev:frontend`

### Smart Contracts

*   **`VaultSpot.sol`**: The central custody and accounting contract. It holds all user assets in a non-custodial manner and tracks balances through an internal ledger.
*   **`IntentSpotRouter.sol`**: A gas-less swap router that processes off-chain signed intents. It is designed to find the best price while neutralizing the risk of relayer manipulation.

### The Relayer

The relayer is a trust-minimized executor that submits signed intents to the `IntentSpotRouter` for on-chain execution. It is responsible for paying the gas fees and is compensated through a `relayerFee`.

### API Reference

The backend is a single serverless function that handles all API routes. The routes are defined in `server/routes.ts`.

### Deployment

*   **Build**: `pnpm run build:frontend` and `pnpm run build:relayer`.
*   **Deploy**: The output in the `dist` directories is ready for deployment to any static hosting provider and serverless function environment.
