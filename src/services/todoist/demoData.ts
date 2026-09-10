import type { TodoistProject, TodoistTask } from '../../types/todoist';
import { getISOFormattedDate } from '../../utils/dateUtils';

export const DEMO_PROJECTS: TodoistProject[] = [
  {
    id: 'proj_work',
    name: 'Work & Strategy',
    color: 'blue',
    order: 1,
    is_favorite: true,
  },
  {
    id: 'proj_operations',
    name: 'Operations & Finance',
    color: 'green',
    order: 2,
    is_favorite: true,
  },
  {
    id: 'proj_team',
    name: 'Team & Hiring',
    color: 'orange',
    order: 3,
    is_favorite: false,
  },
  {
    id: 'proj_personal',
    name: 'Personal & Learning',
    color: 'violet',
    order: 4,
    is_favorite: false,
  },
];

export function getInitialDemoTasks(): TodoistTask[] {
  const today = getISOFormattedDate(0);
  const tomorrow = getISOFormattedDate(1);
  const in3Days = getISOFormattedDate(3);
  const in5Days = getISOFormattedDate(5);
  const overdue1 = getISOFormattedDate(-1);
  const overdue2 = getISOFormattedDate(-2);
  const overdue3 = getISOFormattedDate(-4);

  return [
    // 6 Tasks for Today
    {
      id: 'task_1',
      project_id: 'proj_work',
      content: 'Review Q3 Executive Performance Deck',
      description: 'Check pipeline revenue and operating profit margins.',
      is_completed: false,
      priority: 4, // P1
      order: 1,
      due: { date: today, string: 'Today 10:00 AM' },
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      labels: ['Urgent'],
    },
    {
      id: 'task_2',
      project_id: 'proj_operations',
      content: 'Approve ISO 27001 Security Audit budget',
      description: 'Sign off on vendor proposal and certification timeline.',
      is_completed: false,
      priority: 4, // P1
      order: 2,
      due: { date: today, string: 'Today 11:30 AM' },
      created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
      labels: ['Finance'],
    },
    {
      id: 'task_3',
      project_id: 'proj_work',
      content: 'Client SLA contract review for Global Corp',
      description: 'Verify 99.9% uptime commitments and legal terms.',
      is_completed: false,
      priority: 3, // P2
      order: 3,
      due: { date: today, string: 'Today 2:00 PM' },
      created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      labels: [],
    },
    {
      id: 'task_4',
      project_id: 'proj_team',
      content: 'Interview candidate for VP Engineering',
      description: 'System architecture and leadership discussion.',
      is_completed: false,
      priority: 2, // P3
      order: 4,
      due: { date: today, string: 'Today 4:00 PM' },
      created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
      labels: [],
    },
    {
      id: 'task_5',
      project_id: 'proj_operations',
      content: 'Review weekly cash flow statement with Controller',
      description: 'Check operational burn rate and accounts receivable.',
      is_completed: false,
      priority: 2, // P3
      order: 5,
      due: { date: today, string: 'Today 5:00 PM' },
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      labels: ['Finance'],
    },
    {
      id: 'task_6',
      project_id: 'proj_personal',
      content: 'Plan quarterly leadership offsite agenda',
      description: 'Draft strategic themes and team alignment goals.',
      is_completed: false,
      priority: 1, // P4
      order: 6,
      due: { date: today, string: 'Today 6:00 PM' },
      created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      labels: [],
    },

    // 3 Overdue Tasks
    {
      id: 'task_ov_1',
      project_id: 'proj_operations',
      content: 'Sign annual commercial lease extension agreement',
      description: 'Legal review completed. Awaiting final signature.',
      is_completed: false,
      priority: 4,
      order: 7,
      due: { date: overdue1, string: 'Yesterday' },
      created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
      labels: ['Urgent'],
    },
    {
      id: 'task_ov_2',
      project_id: 'proj_work',
      content: 'Finalize enterprise partner reseller terms',
      description: 'Reconcile tier commissions with partner manager.',
      is_completed: false,
      priority: 3,
      order: 8,
      due: { date: overdue2, string: '2 days ago' },
      created_at: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
      labels: [],
    },
    {
      id: 'task_ov_3',
      project_id: 'proj_team',
      content: 'Approve department hiring plan for Q4',
      description: 'Review open headcount with HR Director.',
      is_completed: false,
      priority: 2,
      order: 9,
      due: { date: overdue3, string: '4 days ago' },
      created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
      labels: [],
    },

    // Upcoming Tasks
    {
      id: 'task_up_1',
      project_id: 'proj_work',
      content: 'Prepare board meeting executive summary',
      description: 'Synthesize department head updates.',
      is_completed: false,
      priority: 4,
      order: 10,
      due: { date: tomorrow, string: 'Tomorrow' },
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      labels: [],
    },
    {
      id: 'task_up_2',
      project_id: 'proj_operations',
      content: 'Review vendor pricing agreements',
      description: 'Evaluate multi-year cloud contract discounts.',
      is_completed: false,
      priority: 2,
      order: 11,
      due: { date: tomorrow, string: 'Tomorrow' },
      created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
      labels: [],
    },
    {
      id: 'task_up_3',
      project_id: 'proj_work',
      content: 'Publish Developer API documentation update',
      description: 'Review release notes for version 2.4.',
      is_completed: false,
      priority: 3,
      order: 12,
      due: { date: in3Days, string: 'In 3 days' },
      created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      labels: [],
    },
    {
      id: 'task_up_4',
      project_id: 'proj_personal',
      content: 'Read Harvard Business Review executive leadership case',
      description: 'Organizational scaling and innovation culture.',
      is_completed: false,
      priority: 1,
      order: 13,
      due: { date: in5Days, string: 'In 5 days' },
      created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
      labels: [],
    },
  ];
}

export function getInitialDemoCompletedTasks(): TodoistTask[] {
  const today = getISOFormattedDate(0);
  const yesterday = getISOFormattedDate(-1);
  const day2 = getISOFormattedDate(-2);
  const day3 = getISOFormattedDate(-3);

  return [
    {
      id: 'task_comp_1',
      project_id: 'proj_work',
      content: 'Sign master services agreement with Orion Corp ($240k)',
      description: 'Completed via DocuSign.',
      is_completed: true,
      priority: 4,
      order: 101,
      due: { date: today },
      created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      completed_at: `${today}T11:20:00Z`,
      labels: [],
    },
    {
      id: 'task_comp_2',
      project_id: 'proj_operations',
      content: 'Audit monthly payroll and tax withholdings',
      description: 'Reconciled with bank statements.',
      is_completed: true,
      priority: 3,
      order: 102,
      due: { date: today },
      created_at: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
      completed_at: `${today}T14:45:00Z`,
      labels: [],
    },
    {
      id: 'task_comp_3',
      project_id: 'proj_team',
      content: 'Extend offer letter to Lead Software Architect',
      description: 'Candidate accepted offer.',
      is_completed: true,
      priority: 4,
      order: 103,
      due: { date: yesterday },
      created_at: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
      completed_at: `${yesterday}T16:00:00Z`,
      labels: [],
    },
    {
      id: 'task_comp_4',
      project_id: 'proj_operations',
      content: 'Renew cyber liability insurance coverage',
      description: 'Signed with underwriter.',
      is_completed: true,
      priority: 3,
      order: 104,
      due: { date: day2 },
      created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
      completed_at: `${day2}T10:30:00Z`,
      labels: [],
    },
    {
      id: 'task_comp_5',
      project_id: 'proj_work',
      content: 'Quarterly cloud database maintenance & backup test',
      description: 'Verified recovery time within 5 minutes.',
      is_completed: true,
      priority: 2,
      order: 105,
      due: { date: day3 },
      created_at: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
      completed_at: `${day3}T15:15:00Z`,
      labels: [],
    },
  ];
}
