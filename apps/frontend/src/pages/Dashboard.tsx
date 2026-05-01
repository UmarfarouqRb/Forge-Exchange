
import React from 'react';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { EnhancedMetricsCard } from '../components/dashboard/EnhancedMetricsCard';
import { TvlChart } from '../components/dashboard/TvlChart';
import { DailyVolumeChart } from '../components/dashboard/DailyVolumeChart';
import { TvlBreakdown } from '../components/dashboard/TvlBreakdown';
import { TradeMetrics } from '../components/dashboard/TradeMetrics';
import { UsersOverview } from '../components/dashboard/UsersOverview';
import { DashboardFooter } from '../components/dashboard/DashboardFooter';

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <DashboardHeader />

      {/* Top Row Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <EnhancedMetricsCard title="Total Value Locked (TVL)" value="$87,175.22" percentageChange={65.36} subtitle="Across 4 assets" />
        <EnhancedMetricsCard title="24H Volume (USD)" value="$15,482.67" percentageChange={32.18} subtitle="Based on settled trades" />
        <EnhancedMetricsCard title="Total Trades" value="270+" percentageChange={152.34} subtitle="All time successful trades" />
        <EnhancedMetricsCard title="Active Users (30D)" value="62" percentageChange={27.59} subtitle="Out of 73 total users" />
        <EnhancedMetricsCard title="Total Transactions" value="400+" percentageChange={104.37} subtitle="Vault deposits, withdrawals & internal transfers" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
            <TvlChart />
        </div>
        <div className="lg:col-span-1">
            <DailyVolumeChart />
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <TvlBreakdown />
        </div>
        <div className="grid grid-cols-1 gap-8">
            <TradeMetrics />
            <UsersOverview />
        </div>
      </div>

      <DashboardFooter />
    </div>
  );
};

export default Dashboard;
