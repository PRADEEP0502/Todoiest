import React from 'react';
import type { PriorityDistributionItem } from '../../utils/analyticsUtils';

interface PriorityDistributionChartProps {
  data: PriorityDistributionItem[];
}

export const PriorityDistributionChart: React.FC<PriorityDistributionChartProps> = ({ data }) => {
  return (
    <div className="space-y-4 py-2">
      {data.map((item) => (
        <div key={item.name} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">{item.name}</span>
            <span className="font-mono text-slate-400">
              {item.count} tasks <span className="text-slate-500">({item.percentage}%)</span>
            </span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(item.percentage, item.count > 0 ? 3 : 0)}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
