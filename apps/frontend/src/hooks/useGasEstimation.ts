import { useSimulateContract } from 'wagmi';
import { useEffect, useState } from 'react';

export function useGasEstimation(args: any) {
  // Only simulate if we have the necessary args to prevent early reverts
  const { data, error } = useSimulateContract({
    ...args,
    query: { enabled: !!args.address && !!args.functionName }
  });
  
  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null);

  useEffect(() => {
    if (data?.request?.gas) {
      // Apply a 20% safety buffer, but cap it well below the 60M block limit
      const bufferedGas = (data.request.gas * 120n) / 100n;
      const cappedGas = bufferedGas > 15_000_000n ? 15_000_000n : bufferedGas;
      setGasEstimate(cappedGas);
    }
  }, [data]);

  return { gasEstimate, error };
}
