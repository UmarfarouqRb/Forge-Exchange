import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMetrics, TradeMetrics } from '../lib/api';
import { useVault } from '../contexts/VaultContext';
import { TvlChart } from '../components/dashboard/TvlChart';
import { MetricsCard } from '../components/dashboard/MetricsCard';

const Dashboard: React.FC = () => {
  const { data: metrics, isLoading } = useQuery<TradeMetrics>({
    queryKey: ['tradeMetrics'],
    queryFn: getMetrics,
  });

  const { vaultTvl } = useVault();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Forge Metrics Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <MetricsCard 
          title="Total Value Locked" 
          value={`$${vaultTvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
        />
        <MetricsCard 
          title="24h Volume" 
          value={isLoading ? 'Loading...' : `$${(metrics?.twentyFourHourVolume || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
        />
        <MetricsCard 
          title="Total Trades" 
          value={isLoading ? 'Loading...' : (metrics?.totalTrades || 0).toLocaleString()} 
        />
        <MetricsCard 
          title="Unique Users" 
          value={isLoading ? 'Loading...' : (metrics?.uniqueUsers || 0).toLocaleString()} 
        />
      </div>
      <div className="w-full h-96">
        <TvlChart />
      </div>
    </div>
  );
};

export default Dashboard;
