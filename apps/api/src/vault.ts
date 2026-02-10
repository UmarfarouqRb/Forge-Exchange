
import { db, tokens } from '@forge/db';

export async function getVaultTokens() {
    const allTokens = await db.select().from(tokens);

    return allTokens.map(token => ({
        ...token,
        deposit_enabled: true,
        withdraw_enabled: true,
        vault_spot_supported: true
    }));
}
