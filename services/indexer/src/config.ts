
// --------------------------------------------------------------------------------
// 1. CONTRACT ADDRESSES
// --------------------------------------------------------------------------------
// IMPORTANT: Replace these with your actual deployed contract addresses on Base.
// Using the zero address as a valid placeholder.
export const VAULT_SPOT_ADDRESS = '0x0000000000000000000000000000000000000000'; // TODO: Replace
export const SPOT_ROUTER_ADDRESS = '0x0000000000000000000000000000000000000000'; // TODO: Replace

// --------------------------------------------------------------------------------
// 2. CONTRACT ABIs (Application Binary Interfaces)
// --------------------------------------------------------------------------------
// These define the structure of the events we want to listen to.
// By defining them 'as const', viem can infer the exact event types for safe decoding.

export const SpotRouterABI = [
  {
    type: "event",
    name: "SpotSwap",
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: true, name: "tokenIn", type: "address" },
      { indexed: true, name: "tokenOut", type: "address" },
      { indexed: false, name: "amountIn", type: "uint256" },
      { indexed: false, name: "amountOut", type: "uint256" },
      { indexed: false, name: "fee", type: "bytes32" },
      { indexed: false, name: "orderId", type: "bytes32" }
    ]
  },
] as const;


export const VaultSpotABI = [
    {
        type: "event",
        name: "Deposit",
        inputs: [
          { indexed: true, name: "user", type: "address" },
          { indexed: true, name: "token", type: "address" },
          { indexed: false, name: "amount", type: "uint256" }
        ]
      },
      {
        type: "event",
        name: "Withdraw",
        inputs: [
          { indexed: true, name: "user", type: "address" },
          { indexed: true, name: "token", type: "address" },
          { indexed: false, name: "amount", type: "uint256" }
        ]
      }
] as const;

export const AllEventsABI = [...SpotRouterABI, ...VaultSpotABI] as const;
