
import React from 'react';

const assets = [
  { name: 'Ethereum', symbol: 'ETH', value: '45,281.11', percentage: 51.94, logo: '/eth.png' },
  { name: 'Bitcoin', symbol: 'BTC', value: '28,111.43', percentage: 32.25, logo: '/btc.png' },
  { name: 'USD Coin', symbol: 'USDC', value: '10,482.67', percentage: 12.02, logo: '/usdc.png' },
  { name: 'Tether', symbol: 'USDT', value: '3,300.01', percentage: 3.79, logo: '/usdt.png' },
];

export const TvlBreakdown: React.FC = () => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">TVL Breakdown</h3>
      <div className="space-y-4">
        {assets.map((asset) => (
          <div key={asset.symbol} className="flex items-center">
            <img src={asset.logo} alt={asset.name} className="h-8 w-8 mr-3" />
            <div className="flex-grow">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{asset.name} ({asset.symbol})</span>
                <span className="font-semibold">${asset.value}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{asset.percentage}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${asset.percentage}%` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
