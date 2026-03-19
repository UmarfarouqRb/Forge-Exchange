
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
            if (!account) throw new Error('Wallet not connected');
            throw new Error('Public client not available');
        }

        try {
            await publicClient.simulateContract({
                ...args,
                account,
            });

            const estimatedGas = await publicClient.estimateContractGas({
                ...args,
                account,
            });
            const bufferedGas = (estimatedGas * 150n) / 100n;
            return bufferedGas;
        } catch (err) {
            console.error("Gas estimation failed:", err);
            throw err;
        }
    }, [publicClient, account]);

    const writeContractAsync = useCallback(async (args: WriteContractArgs<any, any>) => {
        const gas = await estimateGasWithBuffer(args);
        return originalWriteContractAsync({ ...args, gas });
    }, [estimateGasWithBuffer, originalWriteContractAsync]);

    const estimateGasCost = useCallback(async (args: WriteContractArgs<any, any>) => {
        if (!gasPrice) {
            return null;
        }
        try {
            const gas = await estimateGasWithBuffer(args);
            const gasCost = gas * gasPrice;
            return formatEther(gasCost);
        } catch (error) {
            return null;
        }
    }, [estimateGasWithBuffer, gasPrice]);

    return { writeContractAsync, isPending, error, estimateGas: estimateGasCost };
}
