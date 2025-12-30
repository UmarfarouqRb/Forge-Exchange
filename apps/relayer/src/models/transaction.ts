export interface Transaction {
  id: string;
  to: string;
  calldata: string;
  value: string;
  executeBefore: number;
  executeAfter: number;
  nonce: number;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
}
