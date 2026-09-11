import type { TodoistProject, TodoistSection, TodoistTask } from '../../types/todoist';
import { getISOFormattedDate } from '../../utils/dateUtils';

export const DEMO_PROJECTS: TodoistProject[] = [
  {
    id: 'proj_projects_target',
    name: 'PROJECTS 🎯🎯',
    color: 'blue',
    order: 1,
    is_favorite: true,
  },
  {
    id: 'proj_manpower',
    name: 'MANPOWER 🎯',
    color: 'orange',
    order: 2,
    is_favorite: true,
  },
  {
    id: 'proj_rv',
    name: 'RV',
    color: 'green',
    order: 3,
    is_favorite: false,
  },
  {
    id: 'proj_md_pradeep',
    name: 'MD & PRADEEP',
    color: 'charcoal',
    order: 4,
    is_favorite: true,
  },
  {
    id: 'proj_personal',
    name: 'Personal & Operations',
    color: 'violet',
    order: 5,
    is_favorite: false,
  },
];

export const DEMO_SECTIONS: TodoistSection[] = [
  // Sections inside PROJECTS 🎯🎯
  {
    id: 'sec_onboard',
    project_id: 'proj_projects_target',
    name: 'ON BOARD PROCESS',
    order: 1,
  },
  {
    id: 'sec_website',
    project_id: 'proj_projects_target',
    name: 'WEBSITE',
    order: 2,
  },
  {
    id: 'sec_tech_infra',
    project_id: 'proj_projects_target',
    name: 'TECH INFRASTRUCTURE',
    order: 3,
  },

  // Sections inside MANPOWER 🎯
  {
    id: 'sec_mp_sourcing',
    project_id: 'proj_manpower',
    name: 'SOURCING & RECRUITMENT',
    order: 1,
  },
  {
    id: 'sec_mp_interviews',
    project_id: 'proj_manpower',
    name: 'INTERVIEWS & SELECTION',
    order: 2,
  },

  // Sections inside MD & PRADEEP
  {
    id: 'sec_md_agenda',
    project_id: 'proj_md_pradeep',
    name: 'EXECUTIVE AGENDA',
    order: 1,
  },
  {
    id: 'sec_md_initiatives',
    project_id: 'proj_md_pradeep',
    name: 'STRATEGIC INITIATIVES',
    order: 2,
  },
  {
    id: 'sec_md_approvals',
    project_id: 'proj_md_pradeep',
    name: 'PENDING APPROVALS',
    order: 3,
  },

  // Sections inside RV
  {
    id: 'sec_rv_general',
    project_id: 'proj_rv',
    name: 'GENERAL REVIEW',
    order: 1,
  },
];

export function getInitialDemoTasks(): TodoistTask[] {
  const today = getISOFormattedDate(0);
  const tomorrow = getISOFormattedDate(1);
  const friday = getISOFormattedDate(2);
  const nextWeek = getISOFormattedDate(5);
  const overdue1 = getISOFormattedDate(-1);
  const overdue2 = getISOFormattedDate(-2);
  const overdue3 = getISOFormattedDate(-4);

  return [
    // --- ON BOARD PROCESS (inside PROJECTS 🎯🎯) ---
    {
      id: 'task_demo_101',
      project_id: 'proj_projects_target',
      section_id: 'sec_onboard',
      content: 'Develop LMS-style Onboarding System',
      description: 'Design onboarding milestone pathways for new joinees.',
      is_completed: false,
      priority: 4, // P1
      order: 1,
      due: { date: today, string: 'Today 10:00 AM' },
      created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      labels: ['System'],
      comment_count: 3,
    },
    {
      id: 'task_demo_102',
      project_id: 'proj_projects_target',
      section_id: 'sec_onboard',
      content: 'Review digital induction checklist and employee handbook',
      description: 'Ensure compliance with revised HR policy guidelines.',
      is_completed: false,
      priority: 3, // P2
      order: 2,
      due: { date: today, string: 'Today 2:30 PM' },
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      labels: [],
      comment_count: 1,
    },
    {
      id: 'task_demo_103',
      project_id: 'proj_projects_target',
      section_id: 'sec_onboard',
      content: 'Automate welcome email sequences & IT asset provisioning',
      description: 'Integrate Google Workspace and Slack auto-provisioning.',
      is_completed: false,
      priority: 2, // P3
      order: 3,
      due: { date: tomorrow, string: 'Tomorrow' },
      created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
      labels: [],
    },

    // --- WEBSITE (inside PROJECTS 🎯🎯) ---
    {
      id: 'task_demo_104',
      project_id: 'proj_projects_target',
      section_id: 'sec_website',
      content: 'Finalize corporate website redesign wireframes',
      description: 'Approve typography, hero section copy, and MD message.',
      is_completed: false,
      priority: 4, // P1
      order: 4,
      due: { date: today, string: 'Today 4:00 PM' },
      created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
      labels: ['Design'],
      comment_count: 5,
    },
    {
      id: 'task_demo_105',
      project_id: 'proj_projects_target',
      section_id: 'sec_website',
      content: 'SEO optimization & mobile responsiveness audit',
      description: 'Lighthouse score targeting 95+ performance rating.',
      is_completed: false,
      priority: 2, // P3
      order: 5,
      due: { date: friday, string: 'Friday' },
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      labels: [],
    },

    // --- TECH INFRASTRUCTURE (inside PROJECTS 🎯🎯) ---
    {
      id: 'task_demo_106',
      project_id: 'proj_projects_target',
      section_id: 'sec_tech_infra',
      content: 'Deploy multi-region cloud backup architecture',
      description: 'Ensure automated daily snapshots with 15-minute RPO.',
      is_completed: false,
      priority: 3, // P2
      order: 6,
      due: { date: nextWeek, string: 'Next Week' },
      created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      labels: [],
    },

    // --- SOURCING & RECRUITMENT (inside MANPOWER 🎯) ---
    {
      id: 'task_demo_201',
      project_id: 'proj_manpower',
      section_id: 'sec_mp_sourcing',
      content: 'Manpower requirements sources & consultant vendor review',
      description: 'Finalize contracts with top 3 executive search agencies.',
      is_completed: false,
      priority: 4, // P1
      order: 7,
      due: { date: today, string: 'Today 11:30 AM' },
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      labels: ['Urgent'],
      comment_count: 2,
    },
    {
      id: 'task_demo_202',
      project_id: 'proj_manpower',
      section_id: 'sec_mp_sourcing',
      content: 'Publish job description for Senior Operations Manager',
      description: 'Highlight warehouse automation and vendor management background.',
      is_completed: false,
      priority: 2, // P3
      order: 8,
      due: { date: tomorrow, string: 'Tomorrow' },
      created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
      labels: [],
    },

    // --- INTERVIEWS & SELECTION (inside MANPOWER 🎯) ---
    {
      id: 'task_demo_203',
      project_id: 'proj_manpower',
      section_id: 'sec_mp_interviews',
      content: 'Interview shortlisted VP of Engineering candidates',
      description: 'Technical evaluation and leadership culture alignment.',
      is_completed: false,
      priority: 4, // P1
      order: 9,
      due: { date: today, string: 'Today 5:00 PM' },
      created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      labels: ['Interview'],
      comment_count: 4,
    },

    // --- EXECUTIVE AGENDA (inside MD & PRADEEP) ---
    {
      id: 'task_demo_301',
      project_id: 'proj_md_pradeep',
      section_id: 'sec_md_agenda',
      content: 'Prepare Weekly Review Presentation for MD Sir',
      description: 'Consolidate project progress, blocker items, and resource allocation.',
      is_completed: false,
      priority: 4, // P1
      order: 10,
      due: { date: today, string: 'Today 9:30 AM' },
      created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
      labels: ['Review'],
      comment_count: 6,
    },
    {
      id: 'task_demo_302',
      project_id: 'proj_md_pradeep',
      section_id: 'sec_md_initiatives',
      content: 'Formulate Q4 Growth Strategy & Budget Plan',
      description: 'Align business expansion metrics with operational team.',
      is_completed: false,
      priority: 3, // P2
      order: 11,
      due: { date: friday, string: 'Friday' },
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      labels: [],
    },
    {
      id: 'task_demo_303',
      project_id: 'proj_md_pradeep',
      section_id: 'sec_md_approvals',
      content: 'Sign off on new vendor billing terms & SLA',
      description: 'Requires MD authorization on non-standard payment schedule.',
      is_completed: false,
      priority: 3, // P2
      order: 12,
      due: { date: overdue1, string: 'Yesterday' },
      created_at: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
      labels: ['Urgent'],
      comment_count: 2,
    },

    // --- RV PROJECT ---
    {
      id: 'task_demo_401',
      project_id: 'proj_rv',
      section_id: 'sec_rv_general',
      content: 'Review fleet maintenance log & insurance renewals',
      description: 'Check vehicle inspection certificates across branches.',
      is_completed: false,
      priority: 3, // P2
      order: 13,
      due: { date: overdue2, string: '2 days ago' },
      created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
      labels: [],
    },
    {
      id: 'task_demo_402',
      project_id: 'proj_rv',
      section_id: 'sec_rv_general',
      content: 'Audit monthly fuel expense reconciliation',
      description: 'Reconcile corporate card charges with GPS mileage.',
      is_completed: false,
      priority: 2, // P3
      order: 14,
      due: { date: overdue3, string: '4 days ago' },
      created_at: new Date(Date.now() - 3600000 * 24 * 9).toISOString(),
      labels: [],
    },
  ];
}

export function getInitialDemoCompletedTasks(): TodoistTask[] {
  const today = getISOFormattedDate(0);
  const yesterday = getISOFormattedDate(-1);
  const day2 = getISOFormattedDate(-2);

  return [
    {
      id: 'task_comp_1',
      project_id: 'proj_projects_target',
      section_id: 'sec_onboard',
      content: 'Publish internal knowledge base & wiki guide',
      description: 'Setup Notion / internal portal with standard SOPs.',
      is_completed: true,
      priority: 3,
      order: 101,
      due: { date: today },
      created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      completed_at: `${today}T11:20:00Z`,
      labels: [],
    },
    {
      id: 'task_comp_2',
      project_id: 'proj_md_pradeep',
      section_id: 'sec_md_approvals',
      content: 'Approve ISO 27001 Security Audit scope & milestone plan',
      description: 'Signed off with external auditing firm.',
      is_completed: true,
      priority: 4,
      order: 102,
      due: { date: today },
      created_at: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
      completed_at: `${today}T14:45:00Z`,
      labels: [],
    },
    {
      id: 'task_comp_3',
      project_id: 'proj_manpower',
      section_id: 'sec_mp_interviews',
      content: 'Extend offer letter to Lead Software Architect',
      description: 'Candidate accepted offer. Starting date confirmed.',
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
      project_id: 'proj_rv',
      section_id: 'sec_rv_general',
      content: 'Finalize quarterly equipment maintenance contract',
      description: 'Signed with authorized service partner.',
      is_completed: true,
      priority: 3,
      order: 104,
      due: { date: day2 },
      created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
      completed_at: `${day2}T10:30:00Z`,
      labels: [],
    },
  ];
}
