
import React from 'react';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { EnhancedMetricsCard } from '../components/dashboard/EnhancedMetricsCard';
import { TvlChart } from '../components/dashboard/TvlChart';
import { DailyVolumeChart } from '../components/dashboard/DailyVolumeChart';
import { TvlBreakdown } from '../components/dashboard/TvlBreakdown';
import { TradeMetrics } from '../components/dashboard/TradeMetrics';
import { UsersOverview } from '../components/dashboard/UsersOverview';
import { DashboardFooter } from '../components/dashboard/DashboardFooter';
import { Card } from '../components/ui/card';

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0A0D11] text-white p-4 sm:p-6 lg:p-8">
      <DashboardHeader />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <EnhancedMetricsCard title="Total Value Locked (TVL)" value="$87,175.22" percentageChange={65.36} subtitle="Across 4 assets" />
        <EnhancedMetricsCard title="24H Volume (USD)" value="$15,482.67" percentageChange={32.18} subtitle="Based on settled trades" />
        <EnhancedMetricsCard title="Total Trades" value="270+" percentageChange={152.34} subtitle="All time successful trades" />
        <EnhancedMetricsCard title="Active Users (30D)" value="62" percentageChange={27.59} subtitle="Out of 73 total users" />
        <EnhancedMetricsCard title="Total Transactions" value="400+" percentageChange={104.37} subtitle="Vault deposits, withdrawals & internal transfers" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
            <TvlChart />
        </div>
        <div className="lg:col-span-1">
            <DailyVolumeChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <TvlBreakdown />
        </div>
        <div className="lg:col-span-1 space-y-8">
            <TradeMetrics />
            <UsersOverview />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-400">First Trade</h3>
            <p className="text-2xl font-semibold">Apr 25, 2026</p>
        </Card>
        <Card className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-400">Most Active Day (Volume)</h3>
            <p className="text-2xl font-semibold">Apr 30, 2026</p>
            <p className='text-sm text-gray-400'>$15,482.67</p>
        </Card>
        <Card className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-400">Most Trades in a Day</h3>
            <p className="text-2xl font-semibold">Apr 30, 2026</p>
            <p className='text-sm text-gray-400'>58 Trades</p>
        </Card>
        <Card className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-400">Network</h3>
            <p className="text-2xl font-semibold">Base</p>
        </Card>
      </div>

      <DashboardFooter />
    </div>
  );
};

export default Dashboard;
