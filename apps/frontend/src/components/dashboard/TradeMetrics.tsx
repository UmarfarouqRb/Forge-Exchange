
import React from 'react';
import { TrendingUp, Wallet, Zap } from 'lucide-react';

const metrics = [
  { icon: TrendingUp, title: "Today's Trades", value: "32", footer: "5 trades settled" },
  { icon: Wallet, title: "Top Traded Pair", value: "ETH/USDC", footer: "$3.7m traded" },
  { icon: Zap, title: "Largest Trade", value: "$8,421.31", footer: "3:17 PM • ETH/USDC" },
];

export const TradeMetrics: React.FC = () => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Trade Metrics</h3>
      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-start">
            <div className="bg-gray-700 p-2 rounded-lg mr-4">
                <metric.icon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{metric.title}</p>
              <p className="font-semibold text-lg">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.footer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
