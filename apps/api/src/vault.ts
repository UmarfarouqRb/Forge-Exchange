import { TOKENS, Token } from "./token";
import { createPublicClient, http, erc20Abi } from "viem";
import { base } from "viem/chains";
import { VAULT_SPOT_ADDRESS } from "../../frontend/src/config/contracts";

const alchemyRpcUrl = process.env.ALCHEMY_RPC_URL;
const publicRpcUrl = 'https://mainnet.base.org';

// Prioritize Alchemy RPC if available
const primaryTransport = alchemyRpcUrl ? http(alchemyRpcUrl) : http(publicRpcUrl);
const publicClient = createPublicClient({ chain: base, transport: primaryTransport });

export async function getVaultTokens() {
  const tokenValues = Object.values(TOKENS);
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
        ...token,
        balance: balance.toString(),
        deposit_enabled: true,
        withdraw_enabled: true,
        vault_spot_supported: true
    }});
}
