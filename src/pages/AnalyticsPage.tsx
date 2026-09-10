import React from 'react';
import { useTaskStore } from '../store/TaskContext';
import { Card } from '../components/common/Card';
import { WeeklyChart } from '../components/charts/WeeklyChart';
import { DistributionChart } from '../components/charts/DistributionChart';
import { MonthlyProductivityChart } from '../components/charts/MonthlyProductivityChart';
import { ProjectWorkloadChart } from '../components/charts/ProjectWorkloadChart';
import { PriorityDistributionChart } from '../components/charts/PriorityDistributionChart';
import {
  getWeeklyProductivityData,
  getTaskDistributionData,
  getProjectWorkload,
  getPriorityDistribution,
} from '../utils/analyticsUtils';
import { BarChart3 } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { tasks, completedTasks, projects, metrics } = useTaskStore();

  const weeklyData = getWeeklyProductivityData(tasks, completedTasks);
  const distributionData = getTaskDistributionData(tasks, completedTasks);
  const projectWorkload = getProjectWorkload(projects, tasks, completedTasks);
  const priorityDistribution = getPriorityDistribution(tasks);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-brand-400" />
          <span>Productivity & Velocity Analytics</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Quantitative telemetry, delivery efficiency, and workload distribution metrics.
        </p>
      </div>

      {/* 6 Key Executive Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Tasks
          </span>
          <p className="text-2xl font-bold text-slate-100 mt-1">{metrics.totalTasks}</p>
          <span className="text-[10px] text-slate-500">Active + Done</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Completed
          </span>
          <p className="text-2xl font-bold text-emerald-300 mt-1">{metrics.completed}</p>
          <span className="text-[10px] text-emerald-500">Delivered</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
            Pending Tasks
          </span>
          <p className="text-2xl font-bold text-sky-300 mt-1">{metrics.pendingTasks}</p>
          <span className="text-[10px] text-sky-500">In flight</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
            Overdue
          </span>
          <p className="text-2xl font-bold text-rose-300 mt-1">{metrics.overdue}</p>
          <span className="text-[10px] text-rose-500">Behind schedule</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
            Completion Rate
          </span>
          <p className="text-2xl font-bold text-brand-300 mt-1">{metrics.completionRate}%</p>
          <span className="text-[10px] text-brand-500">Overall ratio</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
            Avg Daily Output
          </span>
          <p className="text-2xl font-bold text-purple-300 mt-1">
            {metrics.avgDailyCompletion}
          </p>
          <span className="text-[10px] text-purple-500">Tasks / day</span>
        </div>
      </div>

      {/* Row 1: Weekly Breakdown + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          className="lg:col-span-2"
          title="Weekly Delivery Velocity (Mon – Sun)"
          subtitle="Completed vs active workload across the standard work cycle"
        >
          <WeeklyChart data={weeklyData} height={250} />
        </Card>

        <Card
          title="Overall Task Status Distribution"
          subtitle="Proportional split of current commitments"
        >
          <DistributionChart data={distributionData} height={250} />
        </Card>
      </div>

      {/* Row 2: Monthly Productivity + Project Workload + Priority Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Monthly Output Trajectory"
          subtitle="Weekly milestone completion velocity"
        >
          <MonthlyProductivityChart height={220} />
        </Card>

        <Card
          title="Project-wise Task Allocation"
          subtitle="Active vs completed distribution by initiative"
        >
          <ProjectWorkloadChart data={projectWorkload} height={220} />
        </Card>

        <Card
          title="Active Priority Distribution"
          subtitle="Criticality breakdown (P1 Urgent to P4 Normal)"
        >
          <PriorityDistributionChart data={priorityDistribution} />
        </Card>
      </div>
    </div>
  );
};
