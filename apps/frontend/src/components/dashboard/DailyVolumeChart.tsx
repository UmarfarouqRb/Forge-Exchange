
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const data = [
    { date: '2026-04-24', volume: 18000 },
    { date: '2026-04-25', volume: 22000 },
    { date: '2026-04-26', volume: 17000 },
    { date: '2026-04-27', volume: 19000 },
    { date: '2026-04-28', volume: 25000 },
    { date: '2026-04-29', volume: 21000 },
    { date: '2026-04-30', volume: 15482 },
];

export const DailyVolumeChart: React.FC = () => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
            <h3 className="text-lg font-semibold">Daily Volume</h3>
            <p className="text-sm text-muted-foreground">USD</p>
        </div>
        <div className="flex items-center space-x-2">
            <button className="px-3 py-1 bg-gray-700 rounded-md text-sm font-medium">7D</button>
        </div>
      </div>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
            <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value as number / 1000)}k`} />
            <Tooltip 
                contentStyle={{ backgroundColor: '#333', border: 'none' }} 
                labelStyle={{ color: '#fff' }}
            />
            <Bar dataKey="volume" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
