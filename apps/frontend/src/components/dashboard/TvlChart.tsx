import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', tvl: 4000 },
  { name: 'Feb', tvl: 3000 },
  { name: 'Mar', tvl: 2000 },
  { name: 'Apr', tvl: 2780 },
  { name: 'May', tvl: 1890 },
  { name: 'Jun', tvl: 2390 },
  { name: 'Jul', tvl: 3490 },
];

export const TvlChart: React.FC = () => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="tvl" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
};
