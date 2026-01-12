import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTradeHistory } from '@/hooks/useTradeHistory';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function TradeHistory() {
  const { data: trades, isLoading } = useTradeHistory();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : trades && trades.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{trade.symbol}</TableCell>
                  <TableCell>{trade.side}</TableCell>
                  <TableCell>{trade.price}</TableCell>
                  <TableCell>{trade.amount}</TableCell>
                  <TableCell>{new Date(trade.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p>You have no trades yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
