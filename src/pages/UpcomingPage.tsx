import { CalendarDays } from 'lucide-react';
import { Gate } from '../components/common/Gate';
import { Count, EmptyState, PageHeader } from '../components/common/ui';
import { GroupedTasks } from '../components/tasks/GroupedTasks';
import { useNow } from '../hooks/useNow';
import { daysBetween, dueDateKey, toDateKey, upcomingBucket, type DateBucket } from '../lib/dates';
import { byPriorityThenTime } from '../lib/stats';
import type { TodoistTask } from '../types/todoist';

export function UpcomingPage() {
  const now = useNow(60_000);

  return (
    <Gate>
      {({ snapshot }) => {
        const todayKey = toDateKey(now);
        const buckets = new Map<string, { bucket: DateBucket; tasks: TodoistTask[]; singleDay: boolean }>();
        const dated = snapshot.tasks
          .map((task) => ({ task, key: dueDateKey(task.due) }))
          .filter((x): x is { task: TodoistTask; key: string } => x.key !== null && daysBetween(todayKey, x.key) >= 0)
          .sort((a, b) => a.key.localeCompare(b.key));

        for (const { task, key } of dated) {
          const bucket = upcomingBucket(key, now);
          let entry = buckets.get(bucket.id);
          if (!entry) buckets.set(bucket.id, (entry = { bucket, tasks: [], singleDay: daysBetween(todayKey, key) < 7 }));
          entry.tasks.push(task);
        }

        return (
          <>
            <PageHeader title="Upcoming" subtitle={`${dated.length} scheduled task${dated.length === 1 ? '' : 's'}`} />
            {buckets.size === 0 ? (
              <EmptyState icon={<CalendarDays size={26} />} title="Nothing scheduled">Tasks with due dates will appear here, grouped by day.</EmptyState>
            ) : (
              <div className="space-y-5">
                {[...buckets.values()].map(({ bucket, tasks, singleDay }) => (
                  <section key={bucket.id}>
                    <div className="mb-2 flex items-baseline gap-2 border-b border-line pb-1.5">
                      <h2 className={`text-[15px] font-semibold ${bucket.id === 'today' ? 'text-accent' : 'text-ink'}`}>{bucket.label}</h2>
                      {bucket.sublabel && <span className="text-[12px] text-ink-3">{bucket.sublabel}</span>}
                      <Count className="ml-auto">{tasks.length}</Count>
                    </div>
                    <GroupedTasks tasks={tasks} viewKey={`upcoming:${bucket.id}`} compare={byPriorityThenTime} hideDue={singleDay} />
                  </section>
                ))}
              </div>
            )}
          </>
        );
      }}
    </Gate>
  );
}
