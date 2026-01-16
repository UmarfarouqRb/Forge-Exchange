
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm {order.orderType.charAt(0).toUpperCase() + order.side.slice(1)} Order</DialogTitle>
          <DialogDescription>
            You are about to place a {order.side} order for {order.amount} {order.symbol.replace('USDT', '')}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 items-center gap-4">
            <span className="text-muted-foreground">Side</span>
            <span className={`font-semibold text-right ${order.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
              {order.side.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <span className="text-muted-foreground">Type</span>
            <span className="text-right">{order.orderType.toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <span className="text-muted-foreground">Amount</span>
            <span className="text-right">{order.amount} {order.symbol.replace('USDT', '')}</span>
          </div>
          {order.orderType === 'limit' && (
            <div className="grid grid-cols-2 items-center gap-4">
              <span className="text-muted-foreground">Price</span>
              <span className="text-right">{order.price} USDT</span>
            </div>
          )}
          <div className="grid grid-cols-2 items-center gap-4">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-right">{order.total.toFixed(2)} USDT</span>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={order.side === 'buy' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
          >
            Confirm {order.side.charAt(0).toUpperCase() + order.side.slice(1)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
