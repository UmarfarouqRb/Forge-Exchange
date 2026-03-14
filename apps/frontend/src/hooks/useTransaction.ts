
import { useWriteContract, useGasPrice, usePublicClient, useAccount } from 'wagmi';
import { formatEther, Abi } from 'viem';
import { useCallback } from 'react';

type WriteContractArgs<TAbi extends Abi | readonly unknown[], TFunctionName extends string> = {
    address: `0x${string}`;
    abi: TAbi;
    functionName: TFunctionName;
    args?: any[];
    value?: bigint;
};

export function useTransaction() {
    const { writeContractAsync: originalWriteContractAsync, isPending, error } = useWriteContract();
    const { data: gasPrice } = useGasPrice();
    const publicClient = usePublicClient();
    const { address: account } = useAccount();

    const estimateGasWithBuffer = useCallback(async (args: WriteContractArgs<any, any>) => {
        if (!publicClient || !account) {
            // This check is important.
            if (!account) throw new Error('Wallet not connected');
            throw new Error('Public client not available');
        }

        try {
            const estimatedGas = await publicClient.estimateContractGas({
                ...args,
                account,
            });
            // Add a 50% buffer to the estimated gas amount.
            const bufferedGas = (estimatedGas * 150n) / 100n;
            return bufferedGas;
        } catch (err) {
            console.error("Gas estimation failed:", err);
            // Re-throw the error to be caught by the calling function.
            // This is crucial for stopping the transaction flow if estimation fails.
            throw err;
        }
    }, [publicClient, account]);

    const writeContractAsync = useCallback(async (args: WriteContractArgs<any, any>) => {
        // First, get the buffered gas estimate.
        // The `estimateGasWithBuffer` will throw if estimation fails,
        // which prevents sending a transaction that is likely to fail.
        const gas = await estimateGasWithBuffer(args);
        
        // Then, execute the transaction with the explicit gas limit.
        return originalWriteContractAsync({ ...args, gas });
    }, [estimateGasWithBuffer, originalWriteContractAsync]);

    const estimateGasCost = useCallback(async (args: WriteContractArgs<any, any>) => {
        // Return null if gas price isn't available yet.
        if (!gasPrice) {
            return null;
        }
        try {
            // Use the same buffered estimate for the UI.
            const gas = await estimateGasWithBuffer(args);
            const gasCost = gas * gasPrice;
            return formatEther(gasCost);
        } catch (error) {
            // If estimation fails, we don't show a cost.
            // The error is already logged by `estimateGasWithBuffer`.
            return null;
        }
    }, [estimateGasWithBuffer, gasPrice]);

    return { writeContractAsync, isPending, error, estimateGas: estimateGasCost };
}
