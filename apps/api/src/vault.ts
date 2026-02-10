import { TOKENS, Token } from "./token";

export function getVaultTokens() {
    return Object.values(TOKENS).map((token: Token) => ({
        ...token,
        deposit_enabled: true,
        withdraw_enabled: true,
        vault_spot_supported: true
    }));
}
