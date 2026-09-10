import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import type { TaskDistributionItem } from '../../utils/analyticsUtils';

interface DistributionChartProps {
  data: TaskDistributionItem[];
  height?: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
          <span className="font-semibold text-slate-200">{data.name}</span>
        </div>
        <p className="text-slate-400 pl-4">{data.value} tasks</p>
      </div>
    );
  }
  return null;
};

export const DistributionChart: React.FC<DistributionChartProps> = ({ data, height = 240 }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4" style={{ height }}>
      <div className="relative w-full sm:w-1/2 h-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-100">{total}</span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full sm:w-1/2 flex flex-col gap-2.5 pr-2">
        {data.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-slate-400">
                <span>{item.value}</span>
                <span className="text-slate-500 w-9 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
