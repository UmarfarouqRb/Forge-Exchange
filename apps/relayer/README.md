
# Relayer

The relayer is a critical component of the Forge ecosystem. It's responsible for receiving and matching user intents, executing them against various decentralized exchanges (DEXs), and ensuring that users get the best possible price for their trades.

## How it Works

The relayer operates by providing a set of API endpoints that allow users to submit, query, and manage their orders. When a new order is received, it's stored in a database and enters the matching engine.

# Matching Engine
The matching engine periodically scans the order book for profitable trading opportunities. It compares the prices of user orders with the current market prices on supported DEXs. When a profitable match is found, the relayer executes the trade on behalf of the user, taking a small fee in the process.

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
