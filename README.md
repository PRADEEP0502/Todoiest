# Workspace — Todoist Dashboard

A clean dashboard that shows an entire Todoist workspace — **Projects → Sections → Tasks → Subtasks** — and lets you complete, edit, add and delete tasks. Todoist is the only source of truth: nothing is hardcoded and there is no separate task database.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + API-contract tests
npm run build      # production build in dist/
```

Opens in **Demo Mode** with sample data. To use the real account, go to **Settings**, paste a Todoist API token (Todoist → Settings → Integrations → Developer) and click **Connect Todoist**. The badge switches to **LIVE TODOIST**. You can also set `VITE_TODOIST_API_TOKEN` in `.env.local`.

> The token is kept in this browser's localStorage and requests go straight from the browser to Todoist (Todoist allows CORS). Only deploy this where the people who can open it are allowed to see the workspace.

## Pages

| Page | What it shows |
| --- | --- |
| Dashboard | Greeting, Total / Today / Overdue / Completed counts, Today's Work, project list with progress |
| Today | Tasks due today grouped Project → Section; overdue tasks in a separate block (collapsed by default) |
| Upcoming | Tasks by date (Today, Tomorrow, weekdays, Next week, months), each grouped Project → Section |
| Projects | Every project, grouped by team workspace and Personal, with sub-projects |
| Project | All sections in Todoist order, task counts, tasks and nested subtasks, collapse/expand per section |
| Completed | Completed tasks with project, section and time; Today / This Week / This Month; reopen |
| Settings | Connect/disconnect Todoist, switch to Demo Mode, greeting name |

Global search (`Ctrl K` or `/`) finds projects, sections and tasks and shows where each one lives, e.g. `PROJECTS 🎯🎯 → ON BOARD PROCESS → Develop LMS-style Onboarding System`.

Collapsed projects, sections and subtasks are remembered per device, keyed by Todoist ID.

## How data flows

```
Todoist API v1  ──►  src/services/todoist/  ──►  src/store/workspace.tsx  ──►  src/lib/hierarchy.ts  ──►  pages
                     (only place with HTTP)       (sync + task actions)        (ID-based tree)
```

- **API:** [Todoist API v1](https://developer.todoist.com/api/v1/) (`https://api.todoist.com/api/v1`). The older REST v2 API has been replaced by v1.
- **Sync** loads everything fresh: `/user`, `/workspaces`, `/projects`, `/sections`, `/tasks`, `/tasks/completed/by_completion_date`, `/labels`, and `/projects/{id}/collaborators` for assignee names. Every list follows `next_cursor` until all pages are loaded. New, renamed, moved and deleted items show up on the next sync with no code changes.
- **When it syncs:** on open, every 5 minutes while the tab is visible, when you come back to the tab, and when you press **Sync**. The button shows each step (Fetching projects… → Fetching sections… → Fetching tasks… → ✓ Sync complete).
- **Task actions:** `POST /tasks` (add), `POST /tasks/{id}` (edit), `POST /tasks/{id}/move` (change project or section), `POST /tasks/{id}/close` (complete, with Undo → `/reopen`), `DELETE /tasks/{id}`. Completing a task updates the screen immediately and re-syncs if Todoist returns an error. A sync that overlaps a task change is retried so the change isn't overwritten.
- **Relationships use IDs only** (`project_id`, `section_id`, `parent_id`). Section names can repeat across projects. A task whose section or parent task no longer exists is shown under "No section" or as a top-level task, so it never disappears.
- **Priorities:** Todoist's API stores P1 as `4`. The dashboard converts in one place (`src/lib/priority.ts`).
- **Demo vs live:** each is a separate `DataSource`. Switching mode throws away the previous data, so demo and live data never mix. Demo changes last until the page reloads.

## Project layout

```
src/
  services/todoist/   client (auth, errors, pagination), endpoints, live + demo data sources
  lib/                hierarchy index, dates, search, stats, priority — pure and unit-tested
  store/              workspace state (sync, task actions), UI state (dialog, toasts), settings
  components/         layout (sidebar, top bar, sync status), tasks (row, tree, grouped list, dialog), search
  pages/              Dashboard, Today, Upcoming, Projects, ProjectDetail, Completed, Settings
```

## Tests

`npm test` covers:

- Building the hierarchy: workspace grouping, sub-projects, section order, duplicate section names, subtasks, missing sections/parents, project cycles
- Dynamic changes: new project → section → task appears; renames, moves and deletions are reflected
- A large workspace (80 projects, 640 sections, 9,600 tasks) built quickly and counted correctly
- Date grouping, Completed ranges, and search paths
- The live source against a mocked Todoist API: exact v1 endpoints, request bodies, cursor pagination, sync step order, error messages
- Demo source: completing a parent also completes its subtasks; demo sessions are isolated
