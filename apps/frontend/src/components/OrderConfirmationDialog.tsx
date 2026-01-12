
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface OrderConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  order: {
    side: 'buy' | 'sell';
    amount: string;
    symbol: string;
    price: string;
    orderType: 'limit' | 'market';
    total: number;
  };
}

export function OrderConfirmationDialog({ open, onOpenChange, onConfirm, order }: OrderConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Order</DialogTitle>
          <DialogDescription>
            Please review your order details before confirming.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Side</span>
            <span className={`font-semibold ${order.side === 'buy' ? 'text-blue-500' : 'text-orange-500'}`}>
              {order.side.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span>{order.amount} {order.symbol.replace('USDT', '')}</span>
          </div>
          {order.orderType === 'limit' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span>{order.price} USDT</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span>{order.total.toFixed(2)} USDT</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={order.side === 'buy' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'}
          >
            Confirm {order.side.charAt(0).toUpperCase() + order.side.slice(1)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
