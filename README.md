# TaskFlow — Enterprise Productivity Dashboard for Todoist

**TaskFlow** is an executive-grade, production-quality productivity dashboard engineered on top of the **Todoist REST API v2**. Designed specifically for executive briefings and high-level decision makers, TaskFlow transforms granular task tracking into operational velocity metrics, strategic workload analysis, and priority timelines.

---

## 🏛 Architecture

```
Todoist (Cloud)
      ▲
      │ (REST API v2: Tasks, Projects, Labels)
      ▼
TaskFlow Service Layer (src/services/todoist)
      ▲
      │ (Reactive State & Optimistic Mutations)
      ▼
TaskFlow Central Store (src/store/TaskContext)
      ▲
      │ (Typed Hooks & Filter State)
      ▼
Executive UI (Overview, Today, Projects, Analytics, Settings)
```

- **Single Source of Truth**: Todoist remains the authoritative system of record. Every creation, update, priority adjustment, or completion is synced directly with Todoist endpoints.
- **Service Layer Isolation**: All HTTP operations, authentication token parsing, rate-limit recovery, and payload schemas are strictly isolated within `src/services/todoist/`.
- **Zero Hardcoding**: Tokens are configured securely via browser LocalStorage or environment variables (`VITE_TODOIST_API_TOKEN`).
- **Interactive Presentation Mode**: High-fidelity Demo Mode with persistent local state allows flawless demonstrations without requiring live credentials.

---

## 🚀 Key Features & Workspaces

1. **Executive Overview Dashboard**
   - **5 Top KPIs**: Total Tasks, Due Today, Overdue, Completed, Completion Rate.
   - **Weekly Productivity Trend**: Delivery velocity chart across Monday through Sunday.
   - **Task Distribution**: Proportional donut breakdown across status categories.
   - **Priority 1 Urgent Focus**: Dedicated executive action queue for mission-critical objectives.
   - **Today's Execution Agenda**: Real-time snapshot of deliverables due today.

2. **Today Workspace**
   - **Important (P1)**: High-impact priority 1 tasks highlighted with clear badges.
   - **Tasks**: Standard operational assignments scheduled for today.
   - **Completed Today**: Live audit of tasks delivered today.

3. **My Tasks**
   - Comprehensive active task repository with dynamic search, multi-priority filtering, project dropdowns, and column sorting.
   - Quick-add bar for zero-friction task capture.

4. **Upcoming Timeline**
   - Chronological horizons grouped by *Today*, *Tomorrow*, *This Week*, *Later/Future*, and *No Due Date*.

5. **Overdue Control Center**
   - Immediate escalation view showing original target dates, elapsed overdue days, priorities, and assigned projects.

6. **Completed Archive**
   - Historical audit log with time filters (*Today*, *This Week*, *This Month*, *All Time*).

7. **Projects Portfolio**
   - Project cards showing live workload distribution, active vs completed counts, and percentage progress bars.
   - Full project drill-down view with segregated active deliverables and completed archives.

8. **Productivity & Velocity Analytics**
   - 6 quantitative metrics including average daily completion velocity.
   - Recharts-powered business visualizations:
     * Weekly Completed vs Pending
     * Monthly Output Velocity
     * Project Task Allocation
     * Priority Distribution (P1 Urgent to P4 Normal)

9. **Integration & System Settings**
   - Todoist API Token configuration with hide/show toggle.
   - Connection testing & live sync status relative timers.
   - One-click toggle between **Demo Mode** and **Live Todoist Mode**.
   - User preferences (Default view, date format, auto-sync cadence).

10. **Interactive Task Management**
    - Quick priority switcher (P1 Urgent, P2 High, P3 Medium, P4 Normal).
    - Slide-over Task Detail Drawer with editable properties, creation timestamps, completion timestamps, and copyable task IDs.
    - Modal task creation with quick date presets (*Today*, *Tomorrow*, *+1 Wk*), priority buttons, and label tagging.

---

## 🎯 Demo Presentation Flow (For MD Briefing)

1. **Open Overview**: Highlight top KPI cards (Total Tasks, Due Today, Overdue, Completed, Completion Rate) and Weekly Productivity trends.
2. **Open Today**: Show prioritized split between Priority 1 Urgent tasks and standard items.
3. **Create a Task**: Click `Add Task`, select Priority 1, assign project and due date. Show it appearing instantly in the dashboard.
4. **Complete a Task**: Click the checkbox on any task; observe the task smoothly transition to Completed, and notice the Completion Rate and Analytics update in real time.
5. **Open Projects**: Demonstrate project-level delivery percentages and drill into a specific project.
6. **Open Analytics**: Review velocity trajectories, monthly output, and priority distribution.
7. **Open Settings**: Show the mode switcher (Demo Mode vs Live Todoist) and Todoist API connection interface.

---

## 🛠 Tech Stack

- **React 18** + **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Lucide React** (Consistent enterprise icon set)
- **Recharts** (Clean business-grade charts)
- **date-fns** (Strict date math & relative formatting)

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

---

*TaskFlow — Enterprise Productivity Intelligence.*
