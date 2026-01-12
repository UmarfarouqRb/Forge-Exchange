
import { useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';
import { TransactionReceipt } from 'viem';

interface UseTrackedTxProps {
  hash: `0x${string}` | undefined;
  onSuccess?: () => void;
  onError?: () => void;
}

interface UseTrackedTxReturn {
  data: TransactionReceipt | undefined;
  isSuccess: boolean;
  isError: boolean;
}

export function useTrackedTx({ hash, onSuccess, onError }: UseTrackedTxProps): UseTrackedTxReturn {
  const { data, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction successful!', {
        action: {
          label: 'View',
          onClick: () => window.open(`https://sepolia.etherscan.io/tx/${hash}`, '_blank'),
        },
      });
      onSuccess?.();
    } else if (isError) {
      toast.error('Transaction failed.', {
        action: {
          label: 'View',
          onClick: () => window.open(`https://sepolia.etherscan.io/tx/${hash}`, '_blank'),
        },
      });
      onError?.();
    }
  }, [isSuccess, isError, hash, onSuccess, onError]);

  return { data, isSuccess, isError };
}
