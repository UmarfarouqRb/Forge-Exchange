export const VAULT_SPOT_ADDRESS = '0xe7b5f485f2f2734c5887af5e90d9b37bc06d47e1' as const;
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const;

export const INTENT_SPOT_ROUTER_ADDRESS: { [key: number]: `0x${string}` } = {
  8453: '0x4194def5bf4af3ebec559ff705395ff4b7066267',
  84532: '0xc00de92c57ed8072b3253bd7c4dda9def86a2cca'
} as const;

export const TOKENS = {
  WETH: '0x4200000000000000000000000000000000000006',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913',
  WBTC: '0x18141c5141b432153833215132d43132d43132d4',
} as const;

export type Token = keyof typeof TOKENS;
