
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

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
  const isBuy = order.side === 'buy';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Confirm {order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)} Order
          </DialogTitle>
          <DialogDescription>
            Please review your order details before signing.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Side</span>
            <span className={cn("font-semibold", isBuy ? "text-green-500" : "text-red-500")}>
              {order.side.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold font-mono">{order.amount} {order.symbol.replace('USDT', '')}</span>
          </div>
          {order.orderType === 'limit' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Price</span>
              <span className="font-semibold font-mono">{order.price} USDC</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between pt-3 text-base">
          <span className="text-muted-foreground">Total</span>
          <span className="font-bold font-mono">{order.total.toFixed(2)} USDC</span>
        </div>

        <DialogFooter className="gap-2 pt-4 sm:justify-end">
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={isBuy ? 'default' : 'destructive'}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Sign and {isBuy ? 'Buy' : 'Sell'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
