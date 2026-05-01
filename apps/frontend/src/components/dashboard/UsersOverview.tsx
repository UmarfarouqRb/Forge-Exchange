
import React from 'react';
import { Users, UserPlus, Star } from 'lucide-react';

const userStats = [
  { icon: Users, title: "Total Users", value: "73", footer: "5 active today" },
  { icon: UserPlus, title: "New Users", value: "5", footer: "In the last 24h" },
  { icon: Star, title: "Top Tier Users", value: "3", footer: "Tier 3+ with >$10k" },
];

export const UsersOverview: React.FC = () => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Users Overview</h3>
      <div className="space-y-4">
        {userStats.map((stat, index) => (
          <div key={index} className="flex items-start">
            <div className="bg-gray-700 p-2 rounded-lg mr-4">
                <stat.icon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
              <p className="font-semibold text-lg">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.footer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
