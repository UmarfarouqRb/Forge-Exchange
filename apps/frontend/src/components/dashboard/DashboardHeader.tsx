
import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export const DashboardHeader: React.FC = () => {
  return (
    <div className="flex flex-wrap justify-between items-center mb-8">
      <div className="flex items-center mb-4 md:mb-0">
        {/* Assuming you have a logo component or image */}
        <img src="/logo.png" alt="Forge Exchange Logo" className="h-10 w-10 mr-4" />
        <div>
          <h1 className="text-2xl font-bold">Forge Exchange</h1>
          <p className="text-muted-foreground">On-Chain Metrics Dashboard</p>
        </div>
        <div className="flex items-center ml-4 space-x-2">
            <span className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-2.5 py-0.5 rounded-full">BETA</span>
            <span className="bg-gray-700 text-gray-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">5 Days</span>
        </div>
      </div>
      <div className="flex items-center text-sm">
        <Calendar className="w-4 h-4 mr-2" />
        <span>Apr 30, 2026 • 11:36 AM UTC</span>
        <ChevronDown className="w-4 h-4 ml-2" />
      </div>
    </div>
  );
};
