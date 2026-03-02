export const VaultSpotAbi = [
  {
    "type": "function",
    "name": "deposit",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "token", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "depositETH",
    "stateMutability": "payable",
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function",
    "name": "withdraw",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "token", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "withdrawETH",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "balances",
    "stateMutability": "view",
    "inputs": [
      { "name": "user", "type": "address" },
      { "name": "token", "type": "address" }
    ],
    "outputs": [{ "type": "uint256" }]
  },
  {
    "type": "function",
    "name": "internalTransfer",
    "stateMutability": "nonpayable",
    "inputs": [
        { "name": "recipient", "type": "address" },
        { "name": "token", "type": "address" },
        { "name": "amount", "type": "uint256" }
    ],
    "outputs": []
  }
] as const;
