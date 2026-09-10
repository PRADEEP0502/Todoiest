import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface MonthlyProductivityChartProps {
  height?: number;
}

const mockMonthlyData = [
  { week: 'W1', completed: 18, target: 20 },
  { week: 'W2', completed: 24, target: 20 },
  { week: 'W3', completed: 29, target: 25 },
  { week: 'W4', completed: 32, target: 25 },
  { week: 'Current', completed: 28, target: 30 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
        <p className="font-semibold text-slate-200">{label}</p>
        <div className="flex items-center gap-2 text-brand-400">
          <span className="w-2 h-2 rounded-full bg-brand-400" />
          <span>Completed: {payload[0]?.value}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const MonthlyProductivityChart: React.FC<MonthlyProductivityChartProps> = ({ height = 240 }) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={mockMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0c87eb" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0c87eb" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
          <XAxis dataKey="week" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="completed"
            stroke="#0c87eb"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCompleted)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
