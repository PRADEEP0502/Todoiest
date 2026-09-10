import React from 'react';
import { useTaskStore } from '../store/TaskContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { WeeklyChart } from '../components/charts/WeeklyChart';
import { DistributionChart } from '../components/charts/DistributionChart';
import { TaskItemRow } from '../components/tasks/TaskItemRow';
import { getWeeklyProductivityData, getTaskDistributionData } from '../utils/analyticsUtils';
import {
  CheckCircle2,
  Calendar,
  AlertCircle,
  TrendingUp,
  Layers,
  ArrowUpRight,
  Plus,
  ArrowRight,
  Flame,
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const {
    tasks,
    completedTasks,
    metrics,
    enrichedTasks,
    setCurrentTab,
    openCreateModal,
    isDemoMode,
  } = useTaskStore();

  const weeklyData = getWeeklyProductivityData(tasks, completedTasks);
  const distributionData = getTaskDistributionData(tasks, completedTasks);

  const urgentTasks = enrichedTasks.filter((t) => !t.is_completed && t.priority === 4);
  const todayTasks = enrichedTasks.filter((t) => !t.is_completed && t.isToday);

  return (
    <div className="space-y-6">
      {/* Page Header with Welcome & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Executive Overview
            </h1>
            {isDemoMode && (
              <span className="text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Interactive Prototype
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time operational summary, workload distribution, and milestone delivery velocity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => openCreateModal()}
          >
            Create Task
          </Button>
        </div>
      </div>

      {/* Top KPI Section (5 Metrics as requested in prompt) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* TOTAL TASKS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Total Tasks
            </span>
            <span className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-100 font-sans tracking-tight">
              {metrics.totalTasks}
            </span>
            <span className="text-[11px] text-slate-500">active & closed</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span className="text-slate-300 font-medium">{metrics.pendingTasks}</span> pending tasks
          </div>
        </div>

        {/* DUE TODAY */}
        <div
          onClick={() => setCurrentTab('today')}
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-sky-500/40 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-sky-400 uppercase">
              Due Today
            </span>
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-sky-300 font-sans tracking-tight">
              {metrics.dueToday}
            </span>
            <span className="text-[11px] text-sky-400/80">tasks for today</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Action list ready</span>
            <ArrowRight className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* OVERDUE */}
        <div
          onClick={() => setCurrentTab('overdue')}
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-rose-500/40 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-rose-400 uppercase">
              Overdue
            </span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-rose-300 font-sans tracking-tight">
              {metrics.overdue}
            </span>
            <span className="text-[11px] text-rose-400/80">past target date</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span className={metrics.overdue > 0 ? 'text-rose-400' : 'text-slate-500'}>
              {metrics.overdue > 0 ? 'Requires attention' : 'All up to date'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* COMPLETED */}
        <div
          onClick={() => setCurrentTab('completed')}
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
              Completed
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-300 font-sans tracking-tight">
              {metrics.completed}
            </span>
            <span className="text-[11px] text-emerald-400/80">items delivered</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Verified in Todoist</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* COMPLETION RATE */}
        <div className="col-span-2 lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-brand-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-brand-400 uppercase">
              Completion Rate
            </span>
            <span className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-brand-300 font-sans tracking-tight">
              {metrics.completionRate}%
            </span>
            <span className="text-[11px] text-brand-400/80">efficiency</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-brand-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${metrics.completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Productivity Overview Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Productivity (2 cols) */}
        <Card
          className="lg:col-span-2"
          title="Weekly Productivity Trend"
          subtitle="Completed vs pending tasks across Monday through Sunday"
          action={
            <span className="text-xs text-slate-400 font-medium">This Week</span>
          }
        >
          <WeeklyChart data={weeklyData} height={260} />
        </Card>

        {/* Task Distribution (1 col) */}
        <Card
          title="Task Distribution"
          subtitle="Status breakdown of current workspace"
          action={
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setCurrentTab('analytics')}
              icon={<ArrowUpRight className="w-3.5 h-3.5" />}
            >
              Full Analytics
            </Button>
          }
        >
          <DistributionChart data={distributionData} height={260} />
        </Card>
      </div>

      {/* Actionable Tasks Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Executive Focus (P1) */}
        <Card
          title={
            <div className="flex items-center gap-2 text-rose-400 font-semibold">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Priority 1 · Urgent Focus</span>
              {urgentTasks.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {urgentTasks.length}
                </span>
              )}
            </div>
          }
          subtitle="High-impact initiatives requiring decision-making"
          action={
            <Button
              variant="ghost"
              size="xs"
              onClick={() => openCreateModal({ priority: 4 })}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Urgent
            </Button>
          }
          bodyClassName="p-3.5 space-y-2.5"
        >
          {urgentTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-200">No urgent P1 tasks pending!</p>
              <p className="text-slate-500 mt-0.5">All critical initiatives are cleared or scheduled.</p>
            </div>
          ) : (
            urgentTasks.slice(0, 4).map((task) => (
              <TaskItemRow key={task.id} task={task} />
            ))
          )}
        </Card>

        {/* Today's Agenda Preview */}
        <Card
          title={
            <div className="flex items-center gap-2 text-sky-400 font-semibold">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Today's Execution Agenda</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {todayTasks.length}
              </span>
            </div>
          }
          subtitle="Deliverables scheduled for completion today"
          action={
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setCurrentTab('today')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View Today
            </Button>
          }
          bodyClassName="p-3.5 space-y-2.5"
        >
          {todayTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <Calendar className="w-6 h-6 text-sky-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-200">Nothing scheduled for today</p>
              <p className="text-slate-500 mt-0.5">Add a task or check upcoming timelines.</p>
            </div>
          ) : (
            todayTasks.slice(0, 4).map((task) => (
              <TaskItemRow key={task.id} task={task} />
            ))
          )}
        </Card>
      </div>
    </div>
  );
};
