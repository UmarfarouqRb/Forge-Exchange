
import * as React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface OrderTypeSelectorProps {
  orderType: 'limit' | 'market';
  setOrderType: (orderType: 'limit' | 'market') => void;
}

export function OrderTypeSelector({ orderType, setOrderType }: OrderTypeSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full">
          {orderType.charAt(0).toUpperCase() + orderType.slice(1)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => setOrderType('limit')}>
          Limit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setOrderType('market')}>
          Market
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
