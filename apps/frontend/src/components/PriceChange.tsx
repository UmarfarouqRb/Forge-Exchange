import { FiArrowUp, FiArrowDown } from 'react-icons/fi';

interface PriceChangeProps {
  value: number | string;
  className?: string;
}

export function PriceChange({ value, className = '' }: PriceChangeProps) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const isPositive = numValue >= 0;
  const formattedValue = numValue >= 0 ? `+${numValue.toFixed(2)}%` : `${numValue.toFixed(2)}%`;

  return (
    <div
      className={`flex items-center gap-1 font-medium font-mono ${
        isPositive ? 'text-chart-2' : 'text-destructive'
      } ${className}`}
      data-testid={`text-price-change-${isPositive ? 'positive' : 'negative'}`}
    >
      {isPositive ? <FiArrowUp className="w-3 h-3" /> : <FiArrowDown className="w-3 h-3" />}
      <span>{formattedValue}</span>
    </div>
  );
}
