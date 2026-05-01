
import React from 'react';
import { RefreshCw } from 'lucide-react';

export const DashboardFooter: React.FC = () => {
  return (
    <div className="mt-8 flex justify-between items-center text-sm text-muted-foreground">
        <p>Last updated: Apr 30, 2026 • 11:36 AM UTC</p>
        <button className="flex items-center px-3 py-1.5 bg-gray-700 rounded-md hover:bg-gray-600">
            <RefreshCw className="w-3.5 h-3.5 mr-2"/>
            Refresh Data
        </button>
    </div>
  );
};
