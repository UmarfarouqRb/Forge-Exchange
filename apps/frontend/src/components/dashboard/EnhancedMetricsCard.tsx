
import React from 'react';
import { ArrowUp, ArrowDown, Info } from 'lucide-react';

interface EnhancedMetricsCardProps {
  title: string;
  value: string;
  percentageChange: number;
  subtitle: string;
}

export const EnhancedMetricsCard: React.FC<EnhancedMetricsCardProps> = ({ title, value, percentageChange, subtitle }) => {
  const isPositiveChange = percentageChange > 0;

  return (
    <div className="bg-gray-800 p-4 rounded-lg flex flex-col justify-between h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm text-muted-foreground font-medium">{title}</h3>
        <Info className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="mb-4">
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <div className="flex items-center text-sm">
        <div className={`flex items-center ${isPositiveChange ? 'text-green-400' : 'text-red-400'}`}>
          {isPositiveChange ? <ArrowUp className="w-4 h-4"/> : <ArrowDown className="w-4 h-4"/>}
          <span className="font-semibold">{Math.abs(percentageChange).toFixed(2)}%</span>
        </div>
        <p className="text-muted-foreground ml-2">{subtitle}</p>
      </div>
    </div>
  );
};
