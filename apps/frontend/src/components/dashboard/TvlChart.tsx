
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const data = [
    { date: '2026-04-01', tvl: 75000, volume: 12000 },
    { date: '2026-04-05', tvl: 78000, volume: 15000 },
    { date: '2026-04-10', tvl: 82000, volume: 10000 },
    { date: '2026-04-15', tvl: 80000, volume: 18000 },
    { date: '2026-04-20', tvl: 85000, volume: 22000 },
    { date: '2026-04-25', tvl: 88000, volume: 17000 },
    { date: '2026-04-30', tvl: 87175, volume: 15482 },
];

export const TvlChart: React.FC = () => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Total Value Locked (TVL)</h3>
          <p className="text-sm text-muted-foreground">USD</p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1 bg-gray-700 rounded-md text-sm font-medium">30D</button>
        </div>
      </div>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
                <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value as number / 1000)}k`} />
            <Tooltip 
                contentStyle={{ backgroundColor: '#333', border: 'none' }} 
                labelStyle={{ color: '#fff' }}
            />
            <Area type="monotone" dataKey="tvl" stroke="#8884d8" fillOpacity={1} fill="url(#colorTvl)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
