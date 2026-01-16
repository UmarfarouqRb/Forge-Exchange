
# Relayer

The relayer is a critical component of the Forge ecosystem. It's responsible for receiving and matching user intents, executing them against various decentralized exchanges (DEXs), and ensuring that users get the best possible price for their trades.

## Detailed Trade Flow

The Forge Relayer facilitates a sophisticated "gasless" trading experience. Instead of executing transactions directly on the blockchain, users sign an "intent" to trade, which the relayer then verifies and executes. This process involves several key steps, from initial submission to final on-chain settlement.

### 1. Order Submission and Verification

1.  **Frontend:** A user initiates a trade on the frontend. The application constructs a `PlaceOrderPayload` which contains two primary components:
    *   **`intent`**: A JSON object detailing the specifics of the desired trade (e.g., input token, output token, amounts, deadline).
    *   **`signature`**: A cryptographic signature of the `intent`, created using the user's private key.

2.  **API Gateway to Relayer:** The frontend sends this payload to the `/api/orders` endpoint. The API Gateway service proxies this request to the Relayer service.

3.  **Relayer - Verification (`apps/relayer/src/api/orders.ts`):** The `addOrder` function in the relayer receives the request and performs two critical validation steps:
    *   **Signature Verification:** It uses `viem`'s `verifyTypedData` to ensure the `signature` is authentic and the `intent` has not been tampered with.
    *   **Balance Check:** It queries the blockchain to confirm the user's wallet holds a sufficient balance of the `tokenIn` to cover the trade.

### 2. Order Storage

*   Upon successful verification, the relayer transforms the user's intent into a standardized `Order` object and saves it to the database with a status of "open". A `201 Created` response is sent back to the frontend, confirming the order has been accepted and will be processed.

### 3. The Matching Engine: Finding and Executing Trades

The core of the relayer's execution logic is a background process that continuously works to fill open orders. This engine is responsible for finding profitable trading opportunities by comparing the prices of user orders with the current market prices on supported DEXs.

1.  **Continuous Scanning (`apps/relayer/src/matching-engine/index.ts`):** A main loop iterates through all supported trading pairs (markets). For each market, it triggers the processing engine.

2.  **Finding Profitability (`apps/relayer/src/matching-engine/engine.ts`):** The `processMarket` function takes over:
    *   It fetches all "open" orders for the current market from the database.
    *   It then calls `findMostProfitableSwap`, which simulates the trade against the smart contracts of all integrated DEX adapters (e.g., Uniswap). This finds the best possible execution price for the user.

3.  **Execution and Conflict Prevention:** When a profitable match is found, the `executeSwap` function is called:
    *   **Concurrency Lock:** It acquires a distributed lock on the order using Redis. This is a crucial step to prevent multiple relayer instances from attempting to execute the same order simultaneously.
    *   **On-Chain Execution:** It constructs and broadcasts a blockchain transaction, calling the `executeLimitOrder` function on the `IntentSpotRouter` smart contract. This transaction includes the user's original `intent` and `signature`, allowing the smart contract to securely execute the trade on their behalf, with the relayer paying the gas fees.
    *   **Finalization:** Once the transaction is successfully mined, the relayer updates the order's status in the database to "filled" and releases the Redis lock.

## API Endpoints

The relayer exposes the following API endpoints:

*   `POST /api/session/authorize`: Authorizes a user's session, allowing them to interact with the authenticated endpoints.
*   `GET /api/orders/:address`: Retrieves a list of all orders submitted by a specific user address.
*   `POST /api/orders`: Submits a new order to the relayer.
*   `POST /api/spot`: Executes a spot trade on a supported DEX.
*   `GET /api/tokens/:chainId`: Retrieves a list of supported tokens for a given chain ID.

## Environment Variables

To run the relayer, you need to set up the following environment variables in a `.env` file at the root of the project:

| Variable                          | Description                                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`                    | The URL of your Supabase project.                                                                                                                                                                       |
| `SUPABASE_KEY`                    | The public API key for your Supabase project.                                                                                                                                                           |
| `BASE_PROVIDER_URL`               | The URL of a Base mainnet RPC provider.                                                                                                                                                                   |
| `BASE_INTENT_SPOT_ROUTER_ADDRESS` | The address of the Intent Spot Router contract deployed on the Base mainnet. This contract is responsible for executing trades against various DEXs.                                                        |
| `BASE_SESSION_KEY_MANAGER_ADDRESS`| The address of the Session Key Manager contract deployed on the Base mainnet. This contract is responsible for managing user sessions and ensuring that only authorized users can interact with the relayer. |
| `LOCAL_PROVIDER_URL`              | The URL of a local development blockchain RPC provider (e.g., http://localhost:8545).                                                                                                                   |
| `LOCAL_INTENT_SPOT_ROUTER_ADDRESS`| The address of the Intent Spot Router contract deployed on your local development blockchain.                                                                                                             |
| `LOCAL_SESSION_KEY_MANAGER_ADDRESS`| The address of the Session Key Manager contract deployed on your local development blockchain.                                                                                                            |
| `RELAYER_PRIVATE_KEY`             | The private key of the relayer's wallet. This wallet is used to execute trades on behalf of users and needs to have sufficient funds to cover gas fees.                                                     |

**Note:** The relayer is designed to be chain-agnostic, but it currently only supports the Base mainnet and a local development environment. You can add support for other chains by extending the configuration in `packages/common/src/config.ts`.
