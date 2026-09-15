import { ArrowRightLeft, CircleCheckBig, FolderKanban, History, MessageSquare, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { ActivityRow } from '../../lib/activity';
import { IconBadge, type IconTone } from './ui';

/** One recognisable icon per kind of Todoist change, so a log can be scanned at a glance. */
export function ActivityIcon({ row, size = 'sm' }: { row: Pick<ActivityRow, 'kind' | 'action'>; size?: 'sm' | 'md' }) {
  let icon = <History />;
  let tone: IconTone = 'neutral';
  switch (row.kind) {
    case 'completed':
      [icon, tone] = [<CircleCheckBig />, 'good'];
      break;
    case 'added':
      [icon, tone] = [<Plus />, 'info'];
      break;
    case 'updated':
      icon = <Pencil />;
      break;
    case 'reopened':
      [icon, tone] = [<RotateCcw />, 'warn'];
      break;
    case 'deleted':
      [icon, tone] = [<Trash2 />, 'danger'];
      break;
    case 'comment':
      [icon, tone] = [<MessageSquare />, 'info'];
      break;
    case 'project':
      icon = <FolderKanban />;
      break;
    default:
      if (/moved/i.test(row.action)) icon = <ArrowRightLeft />;
  }
  return <IconBadge icon={icon} tone={tone} size={size} />;
}
