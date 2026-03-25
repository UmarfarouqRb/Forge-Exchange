
import { TOKENS, Token } from "../tokens/token";
import { createPublicClient, http, erc20Abi } from "viem";
import { baseSepolia } from "viem/chains";

const VAULT_SPOT_ADDRESS = '0x738D9455f38266F35fB241C0e3EEbdc2EFa6D5cD' as const;

const alchemyRpcUrl = process.env.ALCHEMY_RPC_URL;
const publicRpcUrl = 'https://sepolia.base.org';

// Prioritize Alchemy RPC if available
const primaryTransport = alchemyRpcUrl ? http(alchemyRpcUrl) : http(publicRpcUrl);
const publicClient = createPublicClient({ chain: baseSepolia, transport: primaryTransport });

export async function getVaultTokens() {
  // We filter out ETH because it is a native asset and not a queryable ERC20 in the vault.
  const tokenValues = Object.values(TOKENS).filter(token => token.symbol !== 'ETH');
  const contracts = tokenValues.map((token: Token) => ({
    address: token.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [VAULT_SPOT_ADDRESS],
  }));

  const results = await publicClient.multicall({ contracts });

  return tokenValues.map((token: Token, i) => {
    const balance = (results[i].status === 'success' ? results[i].result : 0) || 0;
    return {
        token: token,
        balance: balance.toString(),
        deposit_enabled: true,
        withdraw_enabled: true,
        vault_spot_supported: true
    }});
}
