
import { useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';

interface UseTrackedTxProps {
  hash: `0x${string}` | undefined;
  onSuccess?: () => void;
  onError?: () => void;
}

export const useTrackedTx = ({ hash, onSuccess, onError }: UseTrackedTxProps) => {
  const { data: receipt, isSuccess, isError } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (receipt && isSuccess) {
      onSuccess?.();
    }
  }, [receipt, isSuccess, onSuccess]);

  useEffect(() => {
    if (isError) {
      onError?.();
    }
  }, [isError, onError]);

  return { receipt, isSuccess, isError };
};
