
import {
    http,
    createPublicClient,
    parseUnits,
    formatUnits,
    getAddress,
    isAddress
} from 'viem';
import { base } from 'viem/chains';
import { INTENT_SPOT_ROUTER_ADDRESS } from '../../frontend/src/config/contracts';
import { intentSpotRouterABI } from '../../frontend/src/abis/IntentSpotRouter';

// --- UTILITY FUNCTIONS ---

function safeAddress(addr?: string | null): `0x${string}` | null {
    if (!addr) return null;
    if (!isAddress(addr)) {
        console.warn(`Invalid address provided: ${addr}`);
        return null;
    }
    return getAddress(addr); // Return checksum-corrected address
}

// --- LIVE DATA FETCHING ---

const alchemyRpcUrl = process.env.ALCHEMY_RPC_URL;
const publicRpcUrl = 'https://mainnet.base.org';

// Prioritize Alchemy RPC if available
const primaryTransport = alchemyRpcUrl ? http(alchemyRpcUrl) : http(publicRpcUrl);
const primaryClient = createPublicClient({ chain: base, transport: primaryTransport });

// Define a fallback client if Alchemy is used
const fallbackClient = alchemyRpcUrl ? createPublicClient({ chain: base, transport: http(publicRpcUrl) }) : null;

export async function getAMMPrice(tokenIn: { address: string; decimals: number }, tokenOut: { address: string; decimals: number }): Promise < number | null > {
    const safeTokenInAddress = safeAddress(tokenIn.address);
    const safeTokenOutAddress = safeAddress(tokenOut.address);

    if (!safeTokenInAddress || !safeTokenOutAddress) {
        console.warn(`AMM call skipped due to invalid token address.`);
        return null;
    }

    const contractCall = {
        address: INTENT_SPOT_ROUTER_ADDRESS[base.id],
        abi: intentSpotRouterABI,
        functionName: 'getAmountOut',
        args: [safeTokenInAddress, safeTokenOutAddress, parseUnits('1', tokenIn.decimals)],
    } as const;

    try {
        const amountOut = await primaryClient.readContract(contractCall);
        return amountOut ? parseFloat(formatUnits(amountOut as bigint, tokenOut.decimals)) : null;
    } catch (error) {
        console.error(`Error fetching AMM price from primary RPC:`, error);
        if (fallbackClient) {
            console.log('Falling back to public RPC...');
            try {
                const amountOut = await fallbackClient.readContract(contractCall);
                return amountOut ? parseFloat(formatUnits(amountOut as bigint, tokenOut.decimals)) : null;
            } catch (fallbackError) {
                console.error(`Error fetching AMM price from fallback RPC:`, fallbackError);
            }
        }
        return null; // Never throw, always return a value
    }
}
