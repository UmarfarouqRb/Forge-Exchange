
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Confirm {order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)} Order
          </DialogTitle>
          <DialogDescription>
            Please review your order details before signing.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Side</span>
            <span className={cn("font-semibold", isBuy ? "text-green-500" : "text-red-500")}>
              {order.side.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold font-mono">{order.amount} {order.symbol.replace('USDT', '')}</span>
          </div>
          {order.orderType === 'limit' && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-semibold font-mono">{order.price} USDC</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between pt-4 text-lg">
          <span className="text-muted-foreground">Total</span>
          <span className="font-bold font-mono">{order.total.toFixed(2)} USDC</span>
        </div>

        <DialogFooter className="gap-2 pt-6 sm:gap-0">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={isBuy ? 'default' : 'destructive'}
            className="w-full sm:w-auto"
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
