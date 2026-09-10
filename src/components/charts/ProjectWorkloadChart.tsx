import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { ProjectWorkloadItem } from '../../utils/analyticsUtils';

interface ProjectWorkloadChartProps {
  data: ProjectWorkloadItem[];
  height?: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
        <p className="font-semibold text-slate-200">{data.name}</p>
        <p className="text-emerald-400">Completed: {data.completed}</p>
        <p className="text-sky-400">Active: {data.pending}</p>
        <p className="text-slate-400">Progress: {data.progress}%</p>
      </div>
    );
  }
  return null;
};

export const ProjectWorkloadChart: React.FC<ProjectWorkloadChartProps> = ({
  data,
  height = 240,
}) => {
  const formattedData = data.map((d) => ({
    ...d,
    shortName: d.name.length > 14 ? d.name.substring(0, 12) + '…' : d.name,
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={formattedData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" horizontal={false} />
          <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="shortName"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={18} />
          <Bar dataKey="pending" stackId="a" fill="#0ea5e9" radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
