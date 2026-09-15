# Workspace — Todoist Management Dashboard

A visual management layer over an existing Todoist workspace. It shows **Projects → Sections → Tasks → Subtasks**, management metrics (overdue categories, holders, labels), activity, comments and notifications — and lets you complete, edit, add, delete and comment on tasks. Todoist is the only source of truth: no project, section, task, label or count is hardcoded, and there is no separate task database.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + API-contract tests
npm run build      # production build in dist/
```

Opens in **Demo Mode** with sample data. To use the real account, go to **Settings**, paste a Todoist API token (Todoist → Settings → Integrations → Developer) and click **Connect Todoist**, or set `VITE_TODOIST_API_TOKEN` in `.env.local`. The badge switches to **LIVE TODOIST**.

> The token is kept in this browser and requests go straight from the browser to Todoist (Todoist allows CORS). Only deploy this where the people who can open it are allowed to see the workspace.

## Pages

| Page | What it shows |
| --- | --- |
| Dashboard | Total Active Tasks, Due Today, Overdue, No Due Date, Completed; A-5 / A-10 / A-30 / A30+ and No CD / No IDD (each card opens its task list); **Project-wise Active Tasks** (top 5, bars open the project, "View All Projects →"); **Holder-wise Active Tasks** (top 5); Today's Important Tasks; Last 24 Hours of activity |
| Projects | Every project with task and section counts; search; All / Active / Recently used filters; rows start collapsed; Expand all / Collapse all |
| Project | Project → Sections → Tasks → Subtasks. Sections and subtasks start collapsed; Expand all / Collapse all |
| Today | Tasks due today grouped Project → Section; overdue block (collapsed by default) |
| Overdue | Category chart and tabs (A-5, A-10, A-30, A30+); table of Task, Project, Section, Due date, Priority, Holder, days late; or a Project → Section view |
| Holder Wise | People by active tasks (chart + table with overdue, due today, no due date, completed, comments). Pick a person to see their metrics, project-wise and section-wise bars, and their tasks as Project → Section → Task |
| Label Wise | Every Todoist label with task count, overdue and completed; open a label for Project → Section → Task |
| Activity Logs | Time, User, Action, Task, Project — last 24 hours or 7 days, filter by type |
| Comments | Total / last 24 h / last 7 days counts and every task comment with author, task, project and time; comments can also be read and added inside any task |
| Notifications | Unread / Read / All, with timestamps; bell with unread count in the top bar |
| Upcoming, Completed | Tasks by date; completed tasks for Today / This Week / This Month (under "More views") |
| Settings | Todoist connection, **metric rules**, greeting name |

Global search (`Ctrl K` or `/`) finds projects, sections, tasks, labels and people and shows the full path, e.g. `MD & PRADEEP → OUR REQUIREMENTS → TODOIST → Dashboard requirements`. Picking a task opens its project and expands **only** the path to it.

## Metric rules (nothing assumed)

- **A-5 / A-10 / A-30 / A30+** default to days past the Todoist due date (1–5, 6–10, 11–30, over 30). In Settings they can instead come from **Todoist labels** or **section names** you choose; tasks without a matching label/section are shown as "No category", not guessed.
- **No Due Date** = active tasks with no due date.
- **No CD / No IDD** show "Set up" until you choose what they mean in Settings: tasks with/without a label, in a section, without a Todoist deadline, or whose description does not mention some text.

## How data flows

```
Todoist API v1  ──►  src/services/todoist/  ──►  src/store/  ──►  src/lib/ (hierarchy, metrics, activity)  ──►  pages
                     (only place with HTTP)       (sync, actions, notifications)
```

- **API:** [Todoist API v1](https://developer.todoist.com/api/v1/).
- **Workspace data:** one `POST /sync` returns projects, sections, tasks and subtasks, comments, labels and collaborators. The first sync is full (`sync_token=*`); later syncs send the saved token and receive only what changed, which is merged by ID — new, renamed, moved, completed and deleted items are reflected with no code changes.
- **Also on each sync:** `GET /tasks/completed/by_completion_date` (this month) and `GET /activities` (last 7 days, only new events after the first load). Team workspace members come from `GET /workspaces/users` when a holder is not a collaborator. If the plan doesn't allow the activity log or completed history, those pages say so instead of showing invented data.
- **Cache:** the last sync is saved in this browser (IndexedDB), so the dashboard opens instantly and continues with an incremental sync.
- **When it syncs:** on open, every 5 minutes while visible, when you return to the tab, shortly after each change, and on **Sync**.
- **Task actions:** `POST /tasks`, `POST /tasks/{id}`, `POST /tasks/{id}/move`, `POST /tasks/{id}/close` (Undo → `/reopen`), `DELETE /tasks/{id}`, `POST /comments`.
- **Notifications:** Todoist has no push channel for a browser dashboard, so notifications are generated at each sync from the activity log (completed, added, changed, new comment) and from tasks passing their due date. Read status is stored on this device.
- **Relationships use IDs only** (`project_id`, `section_id`, `parent_id`, `responsible_uid`). Names are for display.
- **Performance:** projects, sections and subtasks start collapsed; long lists render 50 rows at a time with "Show more".
- **Demo vs live:** separate data sources; switching mode discards the other's data.

## Project layout

```
src/
  services/todoist/   client, Sync API merge, activity/comments, completed tasks, cache, live + demo sources
  lib/                hierarchy, metrics, activity rows, notifications, search, dates — pure and unit-tested
  store/              workspace (sync + actions), notifications (read state), UI, settings
  components/         layout, charts (bar list), tasks (row, tree, table, grouped list, dialog), search, settings
  pages/              Dashboard, Projects, Project, Today, Upcoming, Overdue, Holders, Labels, Metric,
                      Activity, Comments, Notifications, Completed, Settings
```

## Tests

`npm test` covers the hierarchy (including large workspaces and dynamic changes), date grouping, search paths, overdue categories by days/labels/sections, No CD / No IDD rules, holder and label counts, activity rows and notifications, and the live source against a mocked Todoist API (Sync full + incremental merge, completed tasks, activity pagination, plan restrictions, task and comment requests, error messages).
