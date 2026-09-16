import { AlarmClock, Bell, CheckCircle2, CheckCheck, MessageSquare, Pencil, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Gate } from '../components/common/Gate';
import { EmptyState, Notice, PageHeader, ShowMore, Tabs } from '../components/common/ui';
import { usePaged } from '../hooks/usePaged';
import { useNow } from '../hooks/useNow';
import { formatDayHeading, formatTime, toDateKey } from '../lib/dates';
import type { Notification } from '../lib/notifications';
import { useNotifications } from '../store/notifications';
import { useUi } from '../store/ui';
import { useWorkspace } from '../store/workspace';

type Filter = 'unread' | 'read' | 'all';

const ICON: Record<Notification['kind'], ReactNode> = {
  completed: <CheckCircle2 size={16} className="text-accent" />,
  overdue: <AlarmClock size={16} className="text-p1" />,
  comment: <MessageSquare size={16} className="text-p3" />,
  added: <Plus size={16} className="text-ink-2" />,
  updated: <Pencil size={15} className="text-ink-2" />,
  other: <Bell size={15} className="text-ink-3" />,
};

export function NotificationsPage() {
  const { notifications, isRead, unreadCount, markRead, markAllRead } = useNotifications();
  const { settings, setNotifyOwnActions, index } = useWorkspace();
  const { openTask } = useUi();
  const [filter, setFilter] = useState<Filter>('unread');
  const now = useNow(60_000);

  const list = notifications.filter((n) => (filter === 'all' ? true : filter === 'unread' ? !isRead(n) : isRead(n)));
  const { visible, shown, total, more } = usePaged(list, filter);

  return (
    <Gate>
      {() => (
        <>
          <PageHeader
            title="Notification Centre"
            subtitle={`${unreadCount} unread`}
            actions={
              <button type="button" className="btn-secondary" onClick={markAllRead} disabled={!unreadCount}>
                <CheckCheck size={15} /> Mark all as read
              </button>
            }
          />
          <div className="space-y-3">
            <Notice>
              Todoist does not push live notifications to this dashboard. They are created at every sync (every 5 minutes, on Sync, and after your changes) from the Todoist activity log and from tasks passing their due date. Read status is saved on this device.
            </Notice>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Tabs
                label="Filter"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'unread', label: 'Unread', count: unreadCount },
                  { value: 'read', label: 'Read', count: notifications.length - unreadCount },
                  { value: 'all', label: 'All', count: notifications.length },
                ]}
              />
              <label className="inline-flex items-center gap-2 text-[12.5px] text-ink-2">
                <input type="checkbox" checked={settings.notifyOwnActions} onChange={(e) => setNotifyOwnActions(e.target.checked)} className="h-4 w-4 accent-[#1f6f5c]" />
                Include my own changes
              </label>
            </div>

            <div className="panel overflow-hidden">
              {visible.length === 0 ? (
                <EmptyState icon={<Bell size={26} />} title={filter === 'unread' ? 'You are all caught up' : 'No notifications'} />
              ) : (
                <ul>
                  {visible.map((n, i) => {
                    const read = isRead(n);
                    const heading = i === 0 || toDateKey(visible[i - 1].at) !== toDateKey(n.at) ? formatDayHeading(n.at, now) : null;
                    const canOpen = !!n.taskId && !!index?.taskById.has(n.taskId);
                    return (
                      <li key={n.id}>
                        {heading && <div className="border-b border-line bg-canvas/60 px-4 py-1.5 text-[12px] font-semibold text-ink-2">{heading}</div>}
                        <button
                          type="button"
                          onClick={() => {
                            markRead(n.id);
                            if (canOpen) openTask(n.taskId!);
                          }}
                          className={`flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left hover:bg-canvas/60 ${read ? '' : 'bg-accent-soft/40'}`}
                        >
                          <span className="w-16 shrink-0 pt-px text-[12.5px] tabular-nums text-ink-3">{formatTime(n.at)}</span>
                          <span className="mt-px shrink-0">{ICON[n.kind]}</span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[13px] ${read ? 'text-ink-2' : 'font-semibold text-ink'}`}>{n.title}</span>
                            <span className="block break-words text-[13px] text-ink">{n.body}</span>
                            {n.detail && <span className="block break-words text-[12px] text-ink-3">{n.detail}</span>}
                          </span>
                          {!read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <ShowMore shown={shown} total={total} onMore={more} />
            </div>
          </div>
        </>
      )}
    </Gate>
  );
}
