
import { useWriteContract } from 'wagmi';

export function useTransaction() {
  const { writeContractAsync } = useWriteContract();

  return { writeContractAsync };
}
