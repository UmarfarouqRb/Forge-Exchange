export const VAULT_SPOT_ADDRESS = '0x5b5af2b5f71ebd1e738ebb2f05f15cba38b4cd80' as const;
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const;

export const INTENT_SPOT_ROUTER_ADDRESS: { [key: number]: `0x${string}` } = {
  8453: '0x4194def5bf4af3ebec559ff705395ff4b7066267',
} as const;

export const TOKENS = {
  ETH: {
    address: "0x0000000000000000000000000000000000000000",
    decimals: 18
  },
  WETH: {
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18
  },
  USDC: {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6
  },
  USDT: {
    address: "0xfdeA615043833213F3423b4934414065654c54Fe",
    decimals: 6
  },
  DAI: {
    address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    decimals: 18
  },
  BTC: {
    address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    decimals: 8
  },
  AERO: {
    address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    decimals: 18
  },
  TRUMP: {
    address: "0xc27468b12ffA6d714B1b5fBC87eF403F38b82AD4",
    decimals: 18
  },
  SOL: {
    address: "0x311935Cd80B76769bF2ecC9D8Ab7635b2139cf82",
    decimals: 9
  }
} as const;

export type Token = keyof typeof TOKENS;