# Smart ERP System — App Overview, Features & Development Plan

Status: Active
Last updated: 2025-08-10

Purpose
- Single reference for features, architecture, routes, and development planning/tracking.
- Keep this document up to date when adding features, routes, or making architectural decisions.

App structure
- Framework: React 18 + Vite + TypeScript + Tailwind + shadcn-ui
- Backend: Supabase (Auth, DB, Realtime). Access via src/integrations/supabase/client.ts
- Routing: Centralized in src/App.tsx using react-router-dom
- Auth & Permissions: src/contexts/AuthContext.tsx, ProtectedRoute for guards
- UI system: Tokens in index.css and tailwind.config.ts; shadcn components in src/components/ui

Modules & features
- HR Module
  - Employees App
    - EmployeesIndex: list, filter, CRUD
    - DataUploadIndex: bulk upload CSV/Excel, staging, validation
    - Hooks: useEmployees, useEmployeesStaging
  - Recruitment App
    - Mini-apps (tabs/pages)
      - Requests: create, update, assign recruiter, approval workflow
      - Candidates: list candidates and link to requests; assessments
      - Tracker: overview of requests, candidates, process status
    - Components: CreateRequestDialog, RequestDetailsDialog, InterviewAssessmentDialog
    - Hook: useRecruitment (requests, assessments, activities, realtime)

Key routes (guarded)
- / → Index (requires auth)
- /auth → Auth
- /hr → HRDashboard (requires auth)
- /hr/employees → EmployeesIndex (permission: employees.read)
- /hr/employees/data-upload → DataUploadIndex (permission: employees.read)
- /hr/attendance → AttendanceIndex (permission: employees.read)
  - /hr/attendance/overview → DailyOverview
  - /hr/attendance/clock-in-out → ClockInOut
  - /hr/attendance/reports → Reports
- /hr/recruitment → RecruitmentIndex (hub with navigation)
  - /hr/recruitment/requests → RequestsIndex
  - /hr/recruitment/candidates → CandidatesIndex
  - /hr/recruitment/tracker → TrackerIndex

Permissions & roles
- Context exposes hasRole and hasPermission helpers
- Referenced permissions in UI: employees.read, employees.create
- Use <ProtectedRoute requiredPermission="..."> for page-level protection

Data model (public tables referenced)
- employees, employees_staging
- attendance_records, attendance_settings, attendance_policies
- attendance_leave_types, attendance_leave_requests, attendance_overtime
- recruitment_requests, recruitment_activities, interview_assessments
- profiles, role_permissions, user_roles
- Enums: app_role, app_permission, recruitment_status

State & data access pattern
- Reads: supabase.from('<table>').select(...).order(...)
- Writes: insert/update/delete then update local state or refetch
- Realtime: subscribe via supabase.channel(...).on('postgres_changes', ...)

Design system
- Use semantic tokens from index.css and tailwind.config.ts (HSL). No direct hex/rgb.
- Prefer shadcn component variants over ad-hoc classes.
- Ensure responsive design and dark/light mode compatibility.

SEO (for public pages/components)
- Title under 60 chars with keyword; single H1 per page
- Meta description under 160 chars; canonical tags as needed
- Lazy-load images; descriptive alt attributes

Development tracking
- Current work
  - [ ] Describe task: Owner — Files — ETA
  - [ ] ...
- Backlog
  - [x] HR/Employees: Attendance app (clock in/out, logs) — DONE
  - [ ] HR/Employees: Overtime app (request + approval)
  - [ ] HR/Employees: Leave management (balances, calendar)
  - [ ] Recruitment: Candidate sourcing importers
  - [ ] Recruitment: Offer management workflow
  - [ ] Cross-cutting: Notifications system (toasts + inbox)
- Tech debt
  - [ ] Refactor useRecruitment into sub-hooks (requests/assessments/activities)
  - [ ] Extract shared table components for lists
  - [ ] Improve RLS policy coverage documentation

Milestones
- v1.01 Employees MVP — DONE
- v1.02 Attendance — DONE
- v1.03 Overtime — TODO
- v1.04 Leave — TODO
- v1.05 Performance — TODO

Decision log
- 2025-08-10: Recruitment split into mini-apps (Requests, Candidates, Tracker)
- 2025-08-10: Introduced docs/APP_OVERVIEW.md + coordination protocol

How to add a feature (checklist)
1) Plan: Add to Backlog/Current work above with scope and owner
2) UI: Create components under src/apps/<domain>/<feature>/components
3) Page: Add page under src/apps/.../pages and register route in src/App.tsx above catch-all
4) Guard: Wrap with <ProtectedRoute> and update Navbar if new segment affects breadcrumbs
5) Data: Add/extend hooks under src/hooks; subscribe to realtime if needed
6) DB: If schema changes are needed, create a migration under supabase/migrations and regenerate types
7) Docs: Update this file (routes, features, tracking) and LOVABLE-CURSOR-COORDINATION.txt
8) QA: npm run lint && npm run build; add screenshots/GIFs; verify dark/light modes

Directory highlights
- src/App.tsx — routes
- src/pages — top-level pages
- src/apps/hr/employees — Employees module
- src/apps/hr/recruitment — Recruitment module
- src/components/ui — shadcn components
- src/contexts/AuthContext.tsx — auth, roles, permissions
- src/hooks — data hooks

Changelog
- 2025-08-10: Added docs/APP_OVERVIEW.md; expanded recruitment docs; added tracking sections
 
Addendum — 2025-08-10
Security & access
- Supabase Auth with RLS by role; future SSO planned
- Use <ProtectedRoute> with requiredPermission/requiredRole for page-level protection

Workflows & automation (n8n)
- Use n8n for cross-app automations (event-driven and scheduled)
- Proposed directory: workflows/n8n for workflow JSON/specs
- Example: on employees INSERT → create attendance profile; on status change → notify stakeholders

Future apps (planned)
- Procurement (vendors, purchase orders)
- Warehouse (inventory, stock movements)
- Finance (invoicing, expenses)
- Sales (leads, CRM)

Planned schema extensions (Employees)
- employee_custom_fields: extensible attributes per employee
- employee_documents: document records linked to employee with file_url
- Note: These are roadmap items; not present in current generated Supabase types