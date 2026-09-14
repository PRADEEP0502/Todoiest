import type {
  ApiPriority,
  TodoistCollaborator,
  TodoistProject,
  TodoistSection,
  TodoistTask,
  WorkspaceSnapshot,
} from '../../types/todoist';
import { completedWindowStart } from './dataSource';

// Sample workspace for presentations. Shaped exactly like Todoist API v1 data so it flows
// through the same code paths as live data. Section names repeat across projects on purpose.

interface TaskSpec {
  content: string;
  /** Days from today; omit for no due date. */
  due?: number;
  time?: string;
  p?: 1 | 2 | 3 | 4; // UI priority (P1 = most urgent)
  labels?: string[];
  notes?: number;
  who?: string;
  description?: string;
  sub?: TaskSpec[];
}

interface SectionSpec {
  name: string;
  tasks: TaskSpec[];
}

interface ProjectSpec {
  id: string;
  name: string;
  color: string;
  workspace?: string;
  parent?: string;
  inbox?: boolean;
  shared?: boolean;
  /** Tasks that sit directly in the project, outside any section. */
  tasks?: TaskSpec[];
  sections?: SectionSpec[];
  /** Completed tasks: [content, section index or -1, days ago]. */
  done?: [string, number, number][];
}

const PEOPLE: TodoistCollaborator[] = [
  { id: 'u-pradeep', name: 'Pradeep', email: 'pradeep@example.com' },
  { id: 'u-md', name: 'MD', email: 'md@example.com' },
  { id: 'u-kavya', name: 'Kavya S', email: 'kavya@example.com' },
  { id: 'u-arun', name: 'Arun M', email: 'arun@example.com' },
];

const PROJECTS: ProjectSpec[] = [
  {
    id: 'p-inbox',
    name: 'Inbox',
    color: 'grey',
    inbox: true,
    tasks: [
      { content: 'Call CA regarding GST filing', due: 0, p: 2, labels: ['call'] },
      { content: 'Share board meeting slides with directors', due: 2 },
      { content: 'Book travel for Chennai site visit', due: 5, p: 3 },
    ],
    done: [['Renew office internet plan', -1, 1]],
  },
  {
    id: 'p-rv',
    name: 'RV',
    color: 'blue',
    workspace: 'ws-jpm',
    shared: true,
    sections: [
      {
        name: 'Site Visits',
        tasks: [
          { content: 'Inspect RV plant safety compliance', due: 0, time: '10:30', p: 1, labels: ['urgent'], notes: 2, who: 'u-arun' },
          { content: 'Prepare checklist for Coimbatore unit visit', due: 1, p: 2, who: 'u-arun' },
          { content: 'Review last quarter visit reports', due: 6 },
        ],
      },
      {
        name: 'Client Follow-ups',
        tasks: [
          { content: 'Send revised quotation to Sri Lakshmi Traders', due: -2, p: 1, notes: 4, who: 'u-pradeep' },
          { content: 'Follow up on pending PO from Apex Motors', due: 0, p: 2, labels: ['call'] },
          { content: 'Schedule review call with dealer network', due: 3, p: 3 },
        ],
      },
      {
        name: 'Documentation',
        tasks: [
          { content: 'Update RV product catalogue', due: 9, p: 4 },
          { content: 'Archive signed contracts in shared drive' },
        ],
      },
    ],
    done: [
      ['Collect feedback from Madurai dealer', 1, 0],
      ['Finalise RV service agreement', 2, 3],
      ['Site visit — Hosur warehouse', 0, 12],
    ],
  },
  {
    id: 'p-manpower',
    name: 'MANPOWER 🎯',
    color: 'orange',
    workspace: 'ws-jpm',
    shared: true,
    sections: [
      {
        name: 'Hiring Pipeline',
        tasks: [
          { content: 'Manpower requirements sources', due: 1, p: 1, notes: 3, who: 'u-kavya' },
          { content: 'Shortlist candidates for Plant Supervisor', due: 0, p: 2, labels: ['review'], who: 'u-kavya' },
          { content: 'Approve job description for Sales Executive', due: -1, p: 2, who: 'u-md' },
          { content: 'Coordinate with placement agencies', due: 4 },
        ],
      },
      {
        name: 'Training',
        tasks: [
          { content: 'Plan safety training for new joinees', due: 7, p: 3 },
          { content: 'Collect trainer feedback forms', due: 2 },
        ],
      },
      {
        name: 'Follow-ups',
        tasks: [
          { content: 'Check offer acceptance status', due: 1, labels: ['waiting'] },
          { content: 'Remind HR about attendance policy draft', due: 11 },
        ],
      },
    ],
    done: [
      ['Interview panel for Accounts Assistant', 0, 0],
      ['Publish openings on job portals', 0, 4],
      ['Induction for 6 new operators', 1, 9],
    ],
  },
  {
    id: 'p-projects',
    name: 'PROJECTS 🎯🎯',
    color: 'violet',
    workspace: 'ws-jpm',
    shared: true,
    sections: [
      {
        name: 'ON BOARD PROCESS',
        tasks: [
          {
            content: 'Develop LMS-style Onboarding System',
            due: 1,
            p: 1,
            notes: 5,
            who: 'u-pradeep',
            description: 'Self-paced modules, quizzes and completion tracking for every new employee.',
            sub: [
              { content: 'Define module list with HR', due: 0, p: 2 },
              { content: 'Record welcome video from MD', due: 3 },
              { content: 'Choose LMS platform', due: 2, p: 2, labels: ['review'] },
            ],
          },
          { content: 'Create employee handbook v2', due: 5, p: 2, who: 'u-kavya' },
          { content: 'Set up day-one IT access checklist', due: 0, p: 3 },
          { content: 'Buddy programme guidelines', due: 8 },
          { content: 'Onboarding feedback survey', due: 14, p: 4 },
        ],
      },
      {
        name: 'WEBSITE',
        tasks: [
          { content: 'Finalise homepage copy', due: -3, p: 1, labels: ['urgent'], notes: 1, who: 'u-pradeep' },
          { content: 'Approve new product photography', due: 2, p: 2, who: 'u-md' },
          { content: 'Add careers page with open roles', due: 6, p: 3 },
          { content: 'Set up contact form email routing', due: 10 },
        ],
      },
      {
        name: 'MANPOWER',
        tasks: [
          { content: 'Estimate project staffing for Q4', due: 4, p: 2 },
          { content: 'Identify contract engineers for ERP rollout', due: 12 },
        ],
      },
      {
        name: 'ERP Rollout',
        tasks: [],
      },
    ],
    done: [
      ['Kick-off meeting for onboarding system', 0, 1],
      ['Domain renewal', 1, 2],
      ['Wireframes signed off', 1, 6],
      ['Vendor demo — ERP option A', 3, 15],
    ],
  },
  {
    id: 'p-finance',
    name: 'Finance & Accounts',
    color: 'green',
    workspace: 'ws-jpm',
    sections: [
      {
        name: 'Monthly Close',
        tasks: [
          { content: 'Review cash flow statement', due: 0, p: 1, labels: ['finance'] },
          { content: 'Reconcile vendor ledgers', due: 3, p: 3, labels: ['finance'] },
        ],
      },
      { name: 'Audits', tasks: [{ content: 'Share documents with internal auditor', due: 13, p: 2 }] },
    ],
    done: [['Approve September salaries', 0, 0]],
  },
  {
    id: 'p-vendor',
    name: 'Vendor Payments',
    color: 'green',
    workspace: 'ws-jpm',
    parent: 'p-finance',
    tasks: [
      { content: 'Clear pending invoices above ₹5L', due: -1, p: 1, notes: 2 },
      { content: 'Negotiate 60-day credit with steel supplier', due: 8, p: 3 },
    ],
  },
  {
    id: 'p-guide',
    name: 'Todoist Team Guide',
    color: 'charcoal',
    sections: [
      {
        name: 'Getting Started',
        tasks: [
          { content: 'Invite team members to the workspace' },
          { content: 'Create a project for each department' },
        ],
      },
      { name: 'Tips', tasks: [{ content: 'Use sections to group related tasks' }] },
    ],
  },
  {
    id: 'p-md',
    name: 'MD & PRADEEP',
    color: 'red',
    shared: true,
    sections: [
      {
        name: 'Weekly Review',
        tasks: [
          { content: 'Prepare weekly status summary', due: 0, time: '17:00', p: 1, who: 'u-pradeep', notes: 1 },
          { content: 'Review pending approvals list', due: 0, p: 2, who: 'u-md' },
        ],
      },
      {
        name: 'Decisions Pending',
        tasks: [
          { content: 'Decide on second shift for RV plant', due: 2, p: 1, notes: 6, who: 'u-md' },
          { content: 'Approve marketing budget for Q4', due: 4, p: 2, labels: ['finance'], who: 'u-md' },
          { content: 'New office lease — go / no-go', due: 16 },
        ],
      },
      {
        name: 'Follow-ups',
        tasks: [
          { content: 'Bank loan renewal paperwork', due: -4, p: 2, labels: ['waiting'] },
          { content: 'Check status of insurance claim', due: 5 },
        ],
      },
    ],
    done: [
      ['Weekly status summary', 0, 7],
      ['Quarterly board pack', 1, 5],
      ['Approve travel policy update', 1, 18],
    ],
  },
];

const pad = (n: number) => String(n).padStart(2, '0');

function localDate(base: Date, offsetDays: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const toApiPriority = (p: 1 | 2 | 3 | 4 = 4) => (5 - p) as ApiPriority;

export function createDemoSnapshot(now = new Date()): WorkspaceSnapshot {
  const projects: TodoistProject[] = [];
  const sections: TodoistSection[] = [];
  const tasks: TodoistTask[] = [];
  const completed: TodoistTask[] = [];
  let taskSeq = 0;
  const windowStart = completedWindowStart(now);

  const makeTask = (
    spec: TaskSpec,
    projectId: string,
    sectionId: string | null,
    parentId: string | null,
    order: number,
  ): void => {
    const id = `demo-task-${++taskSeq}`;
    tasks.push({
      id,
      project_id: projectId,
      section_id: sectionId,
      parent_id: parentId,
      content: spec.content,
      description: spec.description ?? '',
      priority: toApiPriority(spec.p),
      due:
        spec.due === undefined
          ? null
          : {
              date: localDate(now, spec.due) + (spec.time ? `T${spec.time}:00` : ''),
              string: spec.time ? `at ${spec.time}` : '',
              is_recurring: false,
              lang: 'en',
            },
      labels: spec.labels ?? [],
      responsible_uid: spec.who ?? null,
      note_count: spec.notes ?? 0,
      child_order: order,
      checked: false,
      added_at: now.toISOString(),
      completed_at: null,
    });
    spec.sub?.forEach((child, i) => makeTask(child, projectId, sectionId, id, i + 1));
  };

  PROJECTS.forEach((spec, pIndex) => {
    projects.push({
      id: spec.id,
      name: spec.name,
      color: spec.color,
      parent_id: spec.parent ?? null,
      child_order: pIndex + 1,
      is_shared: spec.shared ?? false,
      inbox_project: spec.inbox ?? false,
      workspace_id: spec.workspace ?? null,
    });

    spec.tasks?.forEach((t, i) => makeTask(t, spec.id, null, null, i + 1));

    const sectionIds: string[] = [];
    spec.sections?.forEach((section, sIndex) => {
      const id = `${spec.id}-s${sIndex + 1}`;
      sectionIds.push(id);
      sections.push({ id, project_id: spec.id, name: section.name, section_order: sIndex + 1 });
      section.tasks.forEach((t, i) => makeTask(t, spec.id, id, null, i + 1));
    });

    spec.done?.forEach(([content, sectionIndex, daysAgo], i) => {
      const minutesEarlier = 20 + ((pIndex * 5 + i) * 37) % 240;
      const at = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - minutesEarlier * 60 * 1000);
      if (at < windowStart) return;
      completed.push({
        id: `demo-done-${spec.id}-${i}`,
        project_id: spec.id,
        section_id: sectionIndex >= 0 ? (sectionIds[sectionIndex] ?? null) : null,
        parent_id: null,
        content,
        description: '',
        priority: 1,
        due: null,
        labels: [],
        responsible_uid: null,
        note_count: 0,
        child_order: i + 1,
        checked: true,
        added_at: null,
        completed_at: at.toISOString(),
      });
    });
  });

  return {
    user: { id: 'u-pradeep', email: 'pradeep@example.com', full_name: 'Pradeep', inbox_project_id: 'p-inbox' },
    workspaces: [{ id: 'ws-jpm', name: 'JPM' }],
    projects,
    sections,
    tasks,
    completed,
    labels: ['urgent', 'call', 'review', 'waiting', 'finance'].map((name, i) => ({
      id: `demo-label-${i}`,
      name,
      color: 'grey',
      order: i,
    })),
    collaborators: Object.fromEntries(PEOPLE.map((p) => [p.id, p])),
    syncedAt: now.toISOString(),
  };
}
