import React from 'react';

interface MetricsCardProps {
  title: string;
  value: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ title, value }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-sm font-medium text-gray-400">{title}</h2>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};
