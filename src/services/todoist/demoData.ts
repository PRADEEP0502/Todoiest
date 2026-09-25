import type {
  TodoistAttachment,
  ActivityEvent,
  ApiPriority,
  Person,
  TodoistComment,
  TodoistProject,
  TodoistSection,
  TodoistTask,
  WorkspaceSnapshot,
} from '../../types/todoist';
import { ACTIVITY_WINDOW_DAYS, completedWindowStart, withCommentCounts } from './dataSource';

// Sample workspace for presentations (Demo Mode only). Shaped exactly like Todoist API v1 data so
// it flows through the same code as live data. Section names repeat across projects on purpose,
// and the activity log below is derived from this data rather than written separately.

type Who = 'u-pradeep' | 'u-md' | 'u-kavya' | 'u-arun' | 'u-meena';

interface TaskSpec {
  content: string;
  /**
   * Dates written into the title the way the workspace does it ("15.08.26, Task, 18.8.26"):
   * [days ago it was created, days ago it was issued]. Left out for tasks with no dates yet.
   */
  dates?: [cdDaysAgo: number, iddDaysAgo: number];
  /** Days from today; omit for no due date. */
  due?: number;
  time?: string;
  /** Todoist deadline, days from today. */
  deadline?: number;
  p?: 1 | 2 | 3 | 4; // UI priority (P1 = most urgent)
  labels?: string[];
  who?: Who;
  description?: string;
  /** Comments: [author, text, hours ago, file attached with it]. */
  comments?: [Who, string, number, DemoFile?][];
  sub?: TaskSpec[];
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
  sections?: [name: string, tasks: TaskSpec[]][];
  /** Completed: [content, section index or -1, days ago, holder]. */
  done?: [string, number, number, Who?][];
  /** Days since anything changed in the project (drives "Recently used"). */
  idleDays?: number;
}

const PEOPLE: Person[] = [
  { id: 'u-pradeep', name: 'Pradeep', email: 'pradeep@example.com' },
  { id: 'u-md', name: 'MD', email: 'md@example.com' },
  { id: 'u-kavya', name: 'Kavya S', email: 'kavya@example.com' },
  { id: 'u-arun', name: 'Arun M', email: 'arun@example.com' },
  { id: 'u-meena', name: 'Meena R', email: 'meena@example.com' },
];

/** Files for the demo: a drawn photo, a document, and a link that no longer works. */
type DemoFile = 'photo' | 'photo2' | 'document' | 'expired';

/** A small picture drawn here rather than fetched, so Demo Mode needs no network. */
const drawing = (bg: string, fg: string, text: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="${bg}"/><circle cx="360" cy="90" r="46" fill="${fg}" opacity="0.35"/><rect x="40" y="200" width="400" height="70" rx="12" fill="${fg}" opacity="0.2"/><text x="40" y="120" font-family="Segoe UI, sans-serif" font-size="34" fill="${fg}">${text}</text></svg>`,
  )}`;

const DEMO_FILES: Record<DemoFile, TodoistAttachment> = {
  photo: { name: 'pump-leak.jpg', type: 'image/jpeg', url: drawing('#e8f1ec', '#1a7f53', 'Pump leak'), image: drawing('#e8f1ec', '#1a7f53', 'Pump leak'), thumbnail: null, width: 480, height: 320, size: 184_320 },
  photo2: { name: 'panel-board.jpg', type: 'image/jpeg', url: drawing('#f3eee6', '#a2601f', 'Panel board'), image: drawing('#f3eee6', '#a2601f', 'Panel board'), thumbnail: null, width: 480, height: 320, size: 231_400 },
  document: { name: 'quotation-2026.pdf', type: 'application/pdf', url: 'https://files.todoist.com/demo/quotation-2026.pdf', image: null, thumbnail: null, width: null, height: null, size: 412_000 },
  // Points nowhere on purpose: the preview must say so instead of leaving a blank box.
  expired: { name: 'old-photo.jpg', type: 'image/jpeg', url: 'https://files.todoist.com/demo/expired-attachment.jpg', image: 'https://files.todoist.com/demo/expired-attachment.jpg', thumbnail: null, width: null, height: null, size: 90_000 },
};

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
    id: 'p-md',
    name: 'MD & PRADEEP',
    color: 'red',
    shared: true,
    sections: [
      [
        'OUR REQUIREMENTS',
        [
          {
            content: 'TODOIST',
            who: 'u-pradeep',
            p: 1,
            sub: [
              {
                content: 'Dashboard requirements',
                due: 1,
                p: 1,
                who: 'u-pradeep',
                comments: [
                  ['u-md', 'Keep the home page simple — numbers first, then the project chart.', 3],
                  ['u-pradeep', 'Draft layout shared. Will review with you tomorrow.', 1],
                ],
                sub: [
                  { content: 'General rules', who: 'u-pradeep' },
                  { content: 'Total active tasks, metrics', due: 1, who: 'u-pradeep' },
                  {
                    content: 'No Dates, metrics',
                    who: 'u-pradeep',
                    sub: [{ content: 'No Due dates' }, { content: 'No CD' }, { content: 'No IDD' }],
                  },
                  { content: 'Activity log, last 24 hours', due: 2, who: 'u-pradeep', comments: [['u-md', 'Show who did what, with time.', 20]] },
                ],
              },
              {
                content: 'Side bar',
                who: 'u-pradeep',
                sub: [
                  { content: 'Dashboard' },
                  { content: 'Project wise' },
                  { content: 'Holder wise' },
                  { content: 'Label wise' },
                  { content: 'Activity logs' },
                  { content: 'Comment box' },
                ],
              },
              {
                content: 'Over dues',
                who: 'u-pradeep',
                due: -2,
                p: 2,
                sub: [{ content: 'Category wise: A-5, A-10, A-30, A30+', who: 'u-pradeep', due: -2, p: 2 }],
              },
            ],
          },
          { content: 'Weekly review format for department heads', due: 3, who: 'u-md', labels: ['review'] },
        ],
      ],
      [
        'Weekly Review',
        [
          { content: 'Prepare weekly status summary', dates: [8, 7], due: 0, time: '17:00', p: 1, who: 'u-pradeep', comments: [['u-md', 'Include overdue count by department.', 5]] },
          { content: 'Review pending approvals list', due: 0, p: 2, who: 'u-md' },
        ],
      ],
      [
        'Decisions Pending',
        [
          {
            content: 'Decide on second shift for RV plant', dates: [30, 26],
            due: 2,
            p: 1,
            who: 'u-md',
            deadline: 7,
            comments: [
              ['u-arun', 'Operators are available from next month.', 30],
              ['u-md', 'Need cost comparison before deciding.', 26],
            ],
          },
          { content: 'Approve marketing budget for Q4', due: 4, p: 2, labels: ['finance'], who: 'u-md' },
          { content: 'New office lease — go / no-go', due: -34, p: 2, who: 'u-md' },
        ],
      ],
      [
        'Follow-ups',
        [
          { content: 'Bank loan renewal paperwork', dates: [70, 60], due: -4, p: 2, labels: ['waiting'], who: 'u-meena' },
          { content: 'Check status of insurance claim', due: 5, who: 'u-meena' },
        ],
      ],
    ],
    done: [
      ['Weekly status summary', 1, 0, 'u-pradeep'],
      ['Quarterly board pack', 2, 5, 'u-md'],
      ['Approve travel policy update', 2, 18, 'u-md'],
    ],
  },
  {
    id: 'p-rv',
    name: 'RV',
    color: 'blue',
    workspace: 'ws-jpm',
    shared: true,
    sections: [
      [
        'Site Visits',
        [
          { content: 'Inspect RV plant safety compliance', dates: [20, 17], due: 0, time: '10:30', p: 1, labels: ['urgent'], who: 'u-arun', comments: [['u-arun', 'Fire extinguishers due for refill.', 2, 'photo'], ['u-arun', 'Panel board also needs a check.', 1, 'photo2']] },
          { content: 'Prepare checklist for Coimbatore unit visit', dates: [11, 9], due: 1, p: 2, who: 'u-arun' },
          { content: 'Review last quarter visit reports', due: -8, who: 'u-arun' },
        ],
      ],
      [
        'Client Follow-ups',
        [
          { content: 'Send revised quotation to Sri Lakshmi Traders', dates: [52, 44], due: -2, p: 1, who: 'u-pradeep', comments: [['u-md', 'Please close this by today.', 4, 'document']] },
          { content: 'Follow up on pending PO from Apex Motors', dates: [15, 14], due: 0, p: 2, labels: ['call'], who: 'u-kavya' },
          { content: 'Schedule review call with dealer network', due: 3, p: 3 },
        ],
      ],
      ['Documentation', [{ content: 'Update RV product catalogue', due: 9, p: 4 }, { content: 'Archive signed contracts in shared drive' }]],
    ],
    done: [
      ['Collect feedback from Madurai dealer', 1, 0, 'u-kavya'],
      ['Finalise RV service agreement', 2, 3, 'u-pradeep'],
      ['Site visit — Hosur warehouse', 0, 12, 'u-arun'],
    ],
  },
  {
    id: 'p-manpower',
    name: 'MANPOWER 🎯',
    color: 'orange',
    workspace: 'ws-jpm',
    shared: true,
    sections: [
      [
        'Hiring Pipeline',
        [
          { content: 'Manpower requirements sources', dates: [41, 38], due: 1, p: 1, who: 'u-kavya', comments: [['u-kavya', 'Two agencies shortlisted.', 22, 'expired'], ['u-md', 'Also check campus hiring.', 9]] },
          { content: 'Shortlist candidates for Plant Supervisor', dates: [27, 22], due: 0, p: 2, labels: ['review'], who: 'u-kavya' },
          { content: 'Approve job description for Sales Executive', dates: [33, 30], due: -1, p: 2, who: 'u-md' },
          { content: 'Coordinate with placement agencies', due: -13, who: 'u-kavya' },
        ],
      ],
      ['Training', [{ content: 'Plan safety training for new joinees', due: 7, p: 3, who: 'u-arun' }, { content: 'Collect trainer feedback forms', due: -19, who: 'u-meena' }]],
      ['Follow-ups', [{ content: 'Check offer acceptance status', due: 1, labels: ['waiting'], who: 'u-kavya' }, { content: 'Remind HR about attendance policy draft', due: 11 }]],
    ],
    done: [
      ['Interview panel for Accounts Assistant', 0, 0, 'u-kavya'],
      ['Publish openings on job portals', 0, 4, 'u-kavya'],
      ['Induction for 6 new operators', 1, 9, 'u-arun'],
    ],
  },
  {
    id: 'p-projects',
    name: 'PROJECTS 🎯🎯',
    color: 'violet',
    workspace: 'ws-jpm',
    shared: true,
    sections: [
      [
        'ON BOARD PROCESS',
        [
          {
            content: 'Develop LMS-style Onboarding System', dates: [36, 33],
            due: 1,
            p: 1,
            who: 'u-pradeep',
            deadline: 20,
            description: 'Self-paced modules, quizzes and completion tracking for every new employee.',
            comments: [['u-md', 'Show a demo in Monday meeting.', 28], ['u-pradeep', 'Module list ready.', 6]],
            sub: [
              { content: 'Define module list with HR', due: 0, p: 2, who: 'u-kavya' },
              { content: 'Record welcome video from MD', due: 3, who: 'u-md' },
              { content: 'Choose LMS platform', due: 2, p: 2, labels: ['review'], who: 'u-pradeep' },
            ],
          },
          { content: 'Create employee handbook v2', dates: [18, 12], due: 5, p: 2, who: 'u-kavya' },
          { content: 'Set up day-one IT access checklist', dates: [9, 7], due: 0, p: 3, who: 'u-arun' },
          { content: 'Buddy programme guidelines', due: 8 },
          { content: 'Onboarding feedback survey', due: 14, p: 4 },
        ],
      ],
      [
        'WEBSITE',
        [
          { content: 'Finalise homepage copy', dates: [60, 51], due: -3, p: 1, labels: ['urgent'], who: 'u-pradeep' },
          { content: 'Approve new product photography', dates: [24, 21], due: 2, p: 2, who: 'u-md' },
          { content: 'Add careers page with open roles', dates: [14, 10], due: 6, p: 3, who: 'u-meena' },
          { content: 'Set up contact form email routing', due: 10 },
        ],
      ],
      ['MANPOWER', [{ content: 'Estimate project staffing for Q4', dates: [22, 19], due: 4, p: 2, who: 'u-kavya' }, { content: 'Identify contract engineers for ERP rollout', due: 12 }]],
      ['ERP Rollout', []],
    ],
    done: [
      ['Kick-off meeting for onboarding system', 0, 1, 'u-pradeep'],
      ['Domain renewal', 1, 2, 'u-meena'],
      ['Wireframes signed off', 1, 6, 'u-pradeep'],
    ],
  },
  {
    id: 'p-finance',
    name: 'Finance & Accounts',
    color: 'green',
    workspace: 'ws-jpm',
    shared: true,
    sections: [
      ['Monthly Close', [{ content: 'Review cash flow statement', dates: [12, 11], due: 0, p: 1, labels: ['finance'], who: 'u-meena' }, { content: 'Reconcile vendor ledgers', dates: [45, 40], due: -6, p: 3, labels: ['finance'], who: 'u-meena' }]],
      ['Audits', [{ content: 'Share documents with internal auditor', due: 13, p: 2, who: 'u-meena' }]],
    ],
    done: [['Approve September salaries', 0, 0, 'u-md']],
  },
  {
    id: 'p-vendor',
    name: 'Vendor Payments',
    color: 'green',
    workspace: 'ws-jpm',
    parent: 'p-finance',
    idleDays: 20,
    tasks: [
      { content: 'Clear pending invoices above ₹5L', due: -1, p: 1, who: 'u-meena' },
      { content: 'Negotiate 60-day credit with steel supplier', due: -47, p: 3 },
    ],
  },
  light('p-marketing', 'Marketing', 'magenta', 2, {
    Campaigns: [{ content: 'Diwali campaign creatives', due: 6, p: 2 }, { content: 'Finalise trade fair stall design', due: 12 }],
    'Social Media': [{ content: 'Plan October LinkedIn posts', due: 3, p: 3 }, { content: 'Respond to Google reviews', labels: ['urgent'] }, { content: 'Customer testimonial video', due: 20 }],
  }),
  light('p-legal', 'Legal & Compliance', 'charcoal', 9, {
    Contracts: [{ content: 'Review distributor agreement renewal', due: 15, p: 2 }, { content: 'NDA template update' }],
    Licences: [{ content: 'Factory licence renewal', due: -9, p: 1, deadline: 3 }, { content: 'Fire safety certificate', due: 30 }],
  }),
  light('p-it', 'IT Infrastructure', 'teal', 1, {
    Hardware: [{ content: 'Replace plant floor Wi-Fi access points', due: 4, p: 2 }, { content: 'Laptop allocation for new joinees', due: 2 }],
    Software: [{ content: 'Tally upgrade to latest version', due: -26 }, { content: 'Evaluate ERP vendors shortlist', due: 5, p: 2 }, { content: 'Renew Microsoft 365 licences', due: 18 }],
    Security: [{ content: 'Enable two-factor login for all staff', dates: [16, 13], due: 7, p: 1 }, { content: 'Quarterly data backup test' }],
  }),
  light('p-procurement', 'Procurement', 'olive_green', 3, {
    Vendors: [{ content: 'Compare quotes for packaging material', due: 2, p: 2 }, { content: 'Onboard new logistics partner', due: 10 }, { content: 'Vendor rating review' }],
    'Purchase Orders': [{ content: 'Raise PO for spare parts', due: 1, p: 3 }, { content: 'Close pending GRNs', due: -11 }, { content: 'Annual rate contract for diesel', due: 26 }],
  }),
  light('p-quality', 'Quality Control', 'sky_blue', 20, {
    Inspections: [{ content: 'Incoming material inspection checklist' }, { content: 'Calibrate measuring instruments', due: -62 }],
    Audits: [{ content: 'ISO surveillance audit preparation', due: 35, p: 2 }],
  }),
  light('p-support', 'Customer Support', 'lavender', 4, {
    Escalations: [{ content: 'Resolve warranty claim — Apex Motors', due: 1, p: 1 }, { content: 'Call back dealer on delayed shipment', due: 3 }],
    Feedback: [{ content: 'Summarise September complaints', due: 8 }, { content: 'NPS survey to top 50 customers' }],
  }),
  light('p-admin', 'Admin & Facilities', 'taupe', 30, { Office: [{ content: 'AC servicing for conference room' }], Transport: [{ content: 'Renew staff bus contract', due: 40 }] }),
  light('p-csr', 'CSR Initiatives', 'lime_green', 45, { 'Education Drive': [] }),
  light('p-board', 'Board Meetings', 'grape', 6, {
    'Q3 Board Meeting': [{ content: 'Circulate agenda to directors', due: 9, p: 2 }, { content: 'Prepare financial highlights deck', due: 11, p: 1 }],
    AGM: [{ content: 'Book venue for AGM', due: 45 }],
  }),
  {
    id: 'p-guide',
    name: 'Todoist Team Guide',
    color: 'charcoal',
    idleDays: 60,
    sections: [
      ['Getting Started', [{ content: 'Invite team members to the workspace' }, { content: 'Create a project for each department' }]],
      ['Tips', [{ content: 'Use sections to group related tasks' }]],
    ],
  },
  { id: 'p-reading', name: 'Reading List', color: 'salmon', idleDays: 40, tasks: [{ content: 'Good to Great — chapter 5' }, { content: 'The Hard Thing About Hard Things' }] },
  { id: 'p-health', name: 'Health', color: 'mint_green', idleDays: 25, tasks: [{ content: 'Annual health check-up', due: 19 }] },
  { id: 'p-office-move', name: 'Old Office Move', color: 'grey', idleDays: 90, tasks: [] },
];

/** Compact spec for the many smaller team projects a real workspace accumulates. */
function light(id: string, name: string, color: string, idleDays: number, sections: Record<string, TaskSpec[]>): ProjectSpec {
  const holders: (Who | undefined)[] = ['u-kavya', 'u-arun', undefined, 'u-meena', 'u-pradeep', undefined];
  let n = id.length;
  return {
    id,
    name,
    color,
    idleDays,
    workspace: 'ws-jpm',
    shared: true,
    sections: Object.entries(sections).map(([sectionName, tasks]) => [sectionName, tasks.map((t) => ({ who: holders[n++ % holders.length], ...t }))]),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function localDate(base: Date, offsetDays: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "15.08.26" — as the dashboard writes a creation date. */
function titleDate(base: Date, daysAgo: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - daysAgo);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${pad(d.getFullYear() % 100)}`;
}

/** "18.8.26" — the same day written the looser way people type it (no zero padding). */
function looseTitleDate(base: Date, daysAgo: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - daysAgo);
  return `${d.getDate()}.${d.getMonth() + 1}.${pad(d.getFullYear() % 100)}`;
}

const toApiPriority = (p: 1 | 2 | 3 | 4 = 4) => (5 - p) as ApiPriority;

export function createDemoSnapshot(now = new Date()): WorkspaceSnapshot {
  const projects: TodoistProject[] = [];
  const sections: TodoistSection[] = [];
  const tasks: TodoistTask[] = [];
  const completed: TodoistTask[] = [];
  const comments: TodoistComment[] = [];
  const activity: ActivityEvent[] = [];
  const windowStart = completedWindowStart(now);
  const activityStart = now.getTime() - ACTIVITY_WINDOW_DAYS * DAY;
  let taskSeq = 0;
  let commentSeq = 0;
  const at = (msAgo: number) => new Date(now.getTime() - msAgo).toISOString();

  const log = (event: Omit<ActivityEvent, 'id'>) => {
    if (Date.parse(event.event_date) >= activityStart) activity.push({ id: `demo-event-${activity.length + 1}`, ...event });
  };

  const makeTask = (spec: TaskSpec, projectId: string, sectionId: string | null, parentId: string | null, order: number, idle: number) => {
    const id = `demo-task-${++taskSeq}`;
    const updatedAt = at(idle * DAY + ((taskSeq * 7) % 30) * HOUR + ((taskSeq * 13) % 60) * 60 * 1000);
    tasks.push({
      id,
      project_id: projectId,
      section_id: sectionId,
      parent_id: parentId,
      content: spec.dates
        ? `${titleDate(now, spec.dates[0])}, ${spec.content}, ${taskSeq % 2 ? looseTitleDate(now, spec.dates[1]) : titleDate(now, spec.dates[1])}`
        : spec.content,
      description: spec.description ?? '',
      priority: toApiPriority(spec.p),
      due:
        spec.due === undefined
          ? null
          : { date: localDate(now, spec.due) + (spec.time ? `T${spec.time}:00` : ''), string: spec.time ? `at ${spec.time}` : '', is_recurring: false, lang: 'en' },
      deadline: spec.deadline === undefined ? null : { date: localDate(now, spec.deadline) },
      labels: spec.labels ?? [],
      responsible_uid: spec.who ?? null,
      note_count: 0,
      child_order: order,
      checked: false,
      added_at: at((idle + 10) * DAY),
      updated_at: updatedAt,
      completed_at: null,
    });
    // One "updated" event per recently touched top-level task keeps the demo log believable.
    if (!parentId && order === 1) {
      log({ object_type: 'item', object_id: id, event_type: 'updated', event_date: updatedAt, parent_project_id: projectId, parent_item_id: null, initiator_id: spec.who ?? 'u-pradeep', extra_data: { content: spec.content } });
    }
    for (const [author, text, hoursAgo, file] of spec.comments ?? []) {
      const postedAt = at(hoursAgo * HOUR);
      const commentId = `demo-comment-${++commentSeq}`;
      comments.push({ id: commentId, task_id: id, posted_uid: author, content: text, posted_at: postedAt, attachment: file ? DEMO_FILES[file] : null });
      log({ object_type: 'note', object_id: commentId, event_type: 'added', event_date: postedAt, parent_project_id: projectId, parent_item_id: id, initiator_id: author, extra_data: { content: text, parent_item_content: spec.content } });
    }
    spec.sub?.forEach((child, i) => makeTask(child, projectId, sectionId, id, i + 1, idle));
  };

  PROJECTS.forEach((spec, pIndex) => {
    const idle = spec.idleDays ?? 0;
    projects.push({
      id: spec.id,
      name: spec.name,
      color: spec.color,
      parent_id: spec.parent ?? null,
      child_order: pIndex + 1,
      is_shared: spec.shared ?? false,
      inbox_project: spec.inbox ?? false,
      workspace_id: spec.workspace ?? null,
      created_at: at(120 * DAY),
    });

    spec.tasks?.forEach((t, i) => makeTask(t, spec.id, null, null, i + 1, idle));

    const sectionIds: string[] = [];
    spec.sections?.forEach(([name, list], sIndex) => {
      const id = `${spec.id}-s${sIndex + 1}`;
      sectionIds.push(id);
      sections.push({ id, project_id: spec.id, name, section_order: sIndex + 1 });
      list.forEach((t, i) => makeTask(t, spec.id, id, null, i + 1, idle));
    });

    spec.done?.forEach(([content, sectionIndex, daysAgo, who], i) => {
      const minutesEarlier = 20 + (((pIndex * 5 + i) * 37) % 240);
      const completedAt = at(daysAgo * DAY + minutesEarlier * 60 * 1000);
      if (Date.parse(completedAt) < windowStart.getTime()) return;
      const id = `demo-done-${spec.id}-${i}`;
      completed.push({
        id,
        project_id: spec.id,
        section_id: sectionIndex >= 0 ? (sectionIds[sectionIndex] ?? null) : null,
        parent_id: null,
        content,
        description: '',
        priority: 1,
        due: null,
        labels: [],
        responsible_uid: who ?? null,
        note_count: 0,
        child_order: i + 1,
        checked: true,
        added_at: null,
        completed_at: completedAt,
        completed_by_uid: who ?? 'u-pradeep',
      });
      log({ object_type: 'item', object_id: id, event_type: 'completed', event_date: completedAt, parent_project_id: spec.id, parent_item_id: null, initiator_id: who ?? 'u-pradeep', extra_data: { content } });
    });
  });

  activity.sort((a, b) => b.event_date.localeCompare(a.event_date));

  return {
    user: { id: 'u-pradeep', email: 'pradeep@example.com', full_name: 'Pradeep', inbox_project_id: 'p-inbox' },
    workspaces: [{ id: 'ws-jpm', name: 'JPM' }],
    projects,
    sections,
    tasks: withCommentCounts(tasks, comments),
    completed,
    labels: ['urgent', 'call', 'review', 'waiting', 'finance'].map((name, i) => ({ id: `demo-label-${i}`, name, color: ['red', 'blue', 'violet', 'grey', 'green'][i], order: i })),
    comments,
    activity,
    activityStatus: { ok: true },
    completedStatus: { ok: true },
    people: Object.fromEntries(PEOPLE.map((p) => [p.id, p])),
    syncedAt: now.toISOString(),
  };
}
