
import { useSimulateContract } from 'wagmi';
import { useEffect, useState } from 'react';
import { formatGwei } from 'viem';

export function useGasEstimation(args: any) {
  const { data, error } = useSimulateContract(args);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);

  useEffect(() => {
    if (data && data.request.gas) {
      const formattedGas = formatGwei(data.request.gas);
      setGasEstimate(formattedGas);
    }
  }, [data]);

  return { gasEstimate, error };
}
