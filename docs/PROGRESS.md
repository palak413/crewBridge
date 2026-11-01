# CrewBridge — Progress Log

Status labels:
- ✅ **built & verified**: run and tested
- 🟡 **partial**: works, but with a known limitation that is stated
- ⏳ **planned**: not started

## Milestone 1: Foundation, design system, landing, auth UI, dashboard layout

**Status: ✅ complete and re-verified after review fixes (2026-10-31). Awaiting approval to start Milestone 2.**

### Delivered

| Area | Status | Notes |
|---|---|---|
| Monorepo (npm workspaces), `.gitignore`, `.env.example` | ✅ | Only the `client` workspace exists so far. `server` and `shared` arrive in Milestone 3. |
| React 19 + Vite 8 + TypeScript 7 + Tailwind 4 + React Router 8 | ✅ | |
| Design tokens (`client/src/styles/index.css`) | ✅ | Palette as specified, plus `muted-strong` `#66726C` for small text that needs AA contrast |
| UI kit (`components/ui`) | ✅ | Button / ButtonLink, Field + Input, PasswordInput, Alert, Badge / StatusDot, Avatar, Logo, EmptyState, Panel, Spinner |
| Landing page | ✅ | Header (with mobile menu), hero, illustrative product preview, problem/solution, features bento, how it works, use-case tabs (keyboard accessible), CTA, footer |
| Login page | 🟡 | Validation, password toggle, loading and error states. **Calls the real `POST /api/auth/login`**, which doesn't exist yet, so it shows "couldn't reach the server". |
| Registration with role selection | 🟡 | Two steps: role, then details. Live password rules, `?role=` preselect. Calls the real `POST /api/auth/register`, with the same limitation as login. |
| Organizer dashboard layout | 🟡 | Sidebar, top bar (page search, notifications, profile menu), mobile drawer, overview with metric strip, setup guide and empty panels. **Unauthenticated preview, labelled as such.** All figures show "—". |
| Other sidebar pages | 🟡 | Honest "Planned · Milestone N" placeholders |
| 404 page | ✅ | |
| Route code-splitting | ✅ | Landing JS is 114 kB gzip. Auth and app chunks load on demand. |

### Fixes from the Milestone 1 review

1. **Floating chat bubble overlapped the login illustration.**
   - Cause: the bubble was positioned at `-bottom-6 -left-6`, which put it on top of the second candidate row ("Dev Patel"), so that row's reason text was hidden. The bubble appears at ≥1280px only.
   - Fix: moved it to `-bottom-16 -right-8` in `client/src/features/auth/AuthLayout.tsx`, below the card's bottom-right corner.
   - Verified by measuring element positions on `/login` and `/register` at 1280×720, 1440×900 and 1920×1080. The bubble overlaps no candidate row and is never clipped by the aside.
2. **Intermittent test failure.**
   - Symptom: `LoginPage › shows validation errors…` sometimes failed with *"Unable to find role button 'Sign in'"*. It reproduced reliably when `tsc` ran in parallel.
   - Cause: a race in the test helper, not a timeout. Routes are lazy-loaded, and React Router sets `router.state.initialized = true` *before* React commits the lazily loaded page. Queries could therefore run against the empty hydrate fallback.
   - Fix: `client/src/test/renderRoute.tsx` now also waits until the rendered container has real content. I tried raising the test timeout first; it didn't help, so I reverted it.
   - Verified with 10 consecutive full-suite runs, 5 of them under parallel `tsc` load: **10/10 passed**.

### Final verification (2026-10-31)

| Check | Result |
|---|---|
| `npm test` (Vitest) | ✅ **5 files, 31/31 tests passing**, 10/10 repeated runs green |
| `npm run build` | ✅ Exit 0. Landing entry chunk is 362.7 kB (114.0 kB gzip). Auth validation is a separate 125.1 kB (38.8 kB gzip) chunk. CSS is 41.3 kB (8.2 kB gzip). |
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` (oxlint) | ✅ 0 warnings, 0 errors |
| Horizontal overflow at 1440 / 1024 / 820 / 390 / 360 px, on `/`, `/login`, `/register`, `/app` and `/app/tasks` | ✅ None |
| Console errors or warnings on page load: `/`, `/login`, `/register` at 1440 / 820 / 390 px | ✅ 0, on both the dev server **and** the production build (`vite preview`) |
| Console during interactions (mobile menu, use-case tabs, validation, password toggle, submit), desktop and mobile | ✅ No app errors. The only entries are the browser's network log lines for the expected `502` from `/api/auth/login` and `/api/auth/register`, because there's no backend until Milestone 3. The UI handles it with the "couldn't reach the server" alert. |

**Unit and component test coverage:**
- the API client's error mapping
- auth schemas
- login validation, password toggle, unreachable-server message, 401 message, redirect only after the server confirms
- register role gate, password rules, request payload
- shell navigation, mobile drawer, page search, notifications
- landing hero, CTAs, use-case tabs, 404

### Known limitations / remaining issues

1. **There is no backend yet**, so sign-in and sign-up cannot succeed. This is intentional: there is no fake authentication.
2. **`/app` is not protected yet.** The `RequireAuth` guard is added in Milestone 3.
3. The profile menu shows "Not signed in". Top-bar search only covers pages until real data exists.
4. Auth zod schemas live in the client. They move to `shared/` in Milestone 3.
5. The Nexconn SDK is not installed, as instructed. The data center is still unconfirmed.
6. The Inter font loads from Google Fonts. Offline, it falls back to the system UI font.

## Milestone 2: Organizer dashboard, events, tasks, volunteers

**Status: ✅ complete and verified (2026-10-31). Awaiting review before Milestone 3.**

### Data approach (as planned in PLAN.md §8)
Screens talk only to a typed `DataSource` interface (`client/src/lib/data/source.ts`) through TanStack Query hooks (`lib/data/queries.ts`). Milestone 2 ships `LocalDemoSource`, a **demo workspace persisted in this browser's localStorage**. It enforces the same validation (shared zod schemas) and referential rules the API will, and throws the same `ApiError` codes. The UI labels it on every app page ("Demo workspace", with a confirmed **Reset demo data** action). Seed records are flagged `isDemo`. Milestone 3 replaces it with an HTTP source in `DataProvider`; screens don't change.

### Delivered

| Area | Status | Notes |
|---|---|---|
| Organizer overview | ✅ | Metrics computed from data; each links to its filtered view. Setup checklist hides when complete. Active events with progress, 14-day created/completed chart (validated palette, tooltip, table view), deadlines (overdue and next 48h), availability breakdown, recent activity. |
| Events list | ✅ | Status filter tabs with counts, search, cards with cover, dates, location, volunteers, teams, progress |
| Create / edit event | ✅ | Name, description, start/end, location, status, cover theme + optional https image URL with live preview. Validation includes end after start. |
| Event workspace | ✅ | Header with actions (task board, edit, delete with cascade confirmation). Tabs: Overview, Departments, Volunteers. Not-found state. |
| Departments | ✅ | Add, edit, delete. Leader selection (auto-joins event). Manage members. Duplicate-name conflict. |
| Event volunteers | ✅ | Add from directory, remove (clears their departments and open assignments), email contact |
| Task board | ✅ | All / My tasks / Available / Completed views with counts. Filters (event, department, priority, search) synced to the URL. Create and edit dialog. Assign from event members (department team first, availability shown). Delete. **Drag-and-drop between columns** plus a keyboard/touch-accessible "Move to / Mark complete" menu. Optimistic moves. Horizontal snap columns on mobile. |
| Volunteer directory | ✅ | Search, filters (event, department, availability, skill) synced to the URL. Responsive table/cards. Add and edit (duplicate email handled). Profile sheet with contact links, availability switch, skills, events and departments, assigned tasks. |
| Top bar | ✅ | Search now covers pages, events, people and tasks. Profile menu shows the demo organizer, labelled "not signed in". |
| UI kit additions | ✅ | Dialog (focus trap, Escape, focus restore; modal or sheet), ConfirmDialog, Select, Textarea, Segmented tabs, Menu, Toast, Skeleton, LoadError, PeoplePicker, EventCover |
| Router error boundary | ✅ | `RouteError` distinguishes real 404s from failed chunk loads and render errors, with a reload action. Previously any route error showed "page doesn't exist". |

### Verification
- `vitest`: **8 files, 67/67 passing**, 3 consecutive runs under parallel `tsc` load. New tests:
  - the data source: validation, referential rules, cascades, persistence, conflict errors, reset
  - task view and filter logic, chart bucketing, due-date labels
  - UI flows: create, edit and 404 for events; add department; create, move and filter tasks; block outside assignees; volunteer filters, add, duplicate email, availability
- `tsc -b` 0 errors. `oxlint` 0 warnings. `npm run build` succeeds; the landing entry is unchanged at 115 kB gzip and every app page is lazy-loaded.
- Headless Chromium against the dev server:
  - 9 app routes at 1440 / 1024 / 820 / 390 px: no horizontal overflow and no console errors or warnings (an overflow in the volunteers filter bar at 1024 px was found and fixed)
  - **real drag-and-drop moved a card and the move survived a reload**
  - landing, login and register still log 0 console messages
- Dev-server stability: dependencies used first inside lazy routes are pre-bundled (`optimizeDeps.include`). This stops Vite's mid-session re-optimization 504, which occurred after installing `@tanstack/react-query`.

### Known limitations (by design until later milestones)
1. Data is per-browser demo data: not shared between users or devices, and there is no sign-in. Both come in Milestone 3.
2. "My tasks" means assigned to *or* created by the demo organizer, so for the organizer it currently matches All.
3. Event covers support a theme or an https image URL. File upload needs the backend.
4. Adding a volunteer creates a directory entry. Email invitations and self sign-up need the backend.
5. Messages (Milestone 4), Analytics and Notifications (Milestone 5) and Settings (Milestone 3) remain labelled placeholders.
## Milestone 3: Backend, database, auth, APIs ✅

### Delivered
- **`shared/` workspace:** domain types, zod schemas, auth schemas and the demo seed. Both client and server validate with the same rules.
- **`server/`:** Express 5 + TypeScript + Mongoose 9. Covers env validation, JWT cookie auth (register, login, logout, me), the CSRF header guard, helmet, the CORS allow-list and auth rate limiting.
  - Models: User, Event, Department, Task, Activity.
  - REST APIs for events, departments, people, tasks and activity, with organizer / leader / volunteer permissions and visibility scoping.
  - Errors return the shared error shape.
- **Seeding:** `npm run seed` loads the demo workspace into a real database. Without `MONGODB_URI`, the dev server uses a temporary in-memory MongoDB and seeds it automatically.
- **Client:**
  - `httpSource` implements the existing `DataSource`, so no screen was rewritten.
  - Live/demo workspace selection, the `RequireSession` guard (redirects on 401 or session expiry) and Sign out in the profile menu.
  - "Explore the demo workspace" on the sign-in page.
  - Role-aware UI hides actions the server would refuse. Volunteers get a read-only task dialog.
  - API requests send the CSRF header; queries no longer retry auth, permission or validation errors.

### Verification (2026-10-31)
- Server: `vitest` + supertest + mongodb-memory-server: **21/21**. Covers auth, cookie flags, CSRF, forged tokens, validation, conflicts, claiming invited accounts, RBAC for all three roles, visibility, cascades, activity and the seed.
- Client: **74/74** (adds live-mode flows: session guard, role hiding, sign-out, demo entry, HTTP source mapping).
- Typecheck (client + server) and lint are clean. Client production build and server esbuild bundle both succeed.
- Manual smoke test against the built server and through the Vite `/api` proxy: health, login, seeded data (3 events, 21 tasks), password hashes absent from responses, 422 field errors, 403 without the CSRF header, no CORS headers for a foreign origin.

### Configuration needed
- `.env` (repo root, never committed): `MONGODB_URI` (Atlas connection string), `JWT_SECRET` (≥32 random characters, e.g. `openssl rand -hex 32`), `CLIENT_ORIGIN`.
- Atlas → Network Access: allow your IP for local use, and Render's outbound IPs for production.
- Then run `npm run seed` once for demo accounts (`priya.sharma@example.org` / `CrewBridge2026`, or set `SEED_DEMO_PASSWORD`).

### Known limitations
- Department leaders can only add people already visible to them (shared events or people they created). Email invitations come later.
- Nexconn channels aren't created yet. `chatChannelId` is reserved on events and departments for Milestone 4.

## Milestone 4: Nexconn Chat SDK integration ✅

### Delivered
- **SDKs:** `@nexconn/chat` and `@nexconn/engine`, both pinned to exactly 26.2.1. Every API used was checked against the installed `index.d.ts`, and the runtime exports were checked too.
- **Server:**
  - Server API client using the SHA1 signature and a millisecond timestamp, with failover to the backup host.
  - Token issue; group create, join, leave and dismiss, batched to the documented limits.
  - `POST /api/chat/session` reconciles the user's authorized channels and returns the App Key, data center and token (never the App Secret).
  - Membership changes and deletions sync to Nexconn in the background.
- **Client:**
  - The Messages page, with event, department and direct channels; search; unread counts; and online presence in the list and header.
  - History paging; real-time delivery; typing indicators in direct messages; optimistic sending with retry.
  - Connection, reconnecting, offline, "not configured" and error states.
  - Sign-out disconnects. Demo mode keeps working with local-only messages, labelled as not sent through Nexconn.

### Verification (2026-11-01)
- **Server:** 29/29 tests. The 8 new tests cover signatures, the SG host, authorized channels only, no leaked secret, removal leading to `leave`, deletion leading to `dismiss`, 502 handling, failover, batching and env rules.
- **Client:** 89/89 tests. The new tests cover the store, the SDK adapter against an SDK mock with the real shapes, and the Messages page in demo and live modes.
- Typecheck, lint and both builds are clean.
- **Live check against the real Nexconn app:**
  - The data center was identified as **SG** with a read-only Server API call: SG answered `code 0`, the SA host answered "App-Key is not exist" and NA timed out.
  - Two users connected with `AreaCode.SG`. Group and direct messages were delivered in real time, a typing indicator arrived, and history paging returned the messages.
  - Presence reported `isOnline: true` on the Web platform, and `onSubscriptionChanged` fired.
  - The test group was dismissed afterwards.
- **Bugs found by the live check and fixed:**
  - `subscribeEvent` needs `expiry`, between 60 and 2,592,000 s, even though the docs say it can be omitted.
  - The SDK allows at most 200 userIds per subscribe call.

### Configuration
- `.env`: `NEXCONN_APP_KEY`, `NEXCONN_APP_SECRET`, `NEXCONN_AREA=SG`. In production, set the same three on Render.
- Real credentials were found in `.env.example`. They were moved to the git-ignored `.env` before anything was committed.

### Known limitations
- Text messages only. Other message types show a placeholder.
- No typing indicators in groups (the SDK supports them only for direct channels).
- Unread counts cover the current session only.
- Renaming an event doesn't rename its Nexconn group (the update-info endpoint hasn't been checked yet).

## Milestone 5: Dispatch, notifications, role experiences — ⏳
## Milestone 6: Testing, responsive polish, deployment, docs — ⏳

## Milestone 5 — Final QA & deployment preparation

- RBAC UI gaps closed: organizer-only CTAs on Overview, guarded event create/edit pages, leader field locked for non-organizers in the department dialog.
- Server: `TRUST_PROXY` (Vercel → Render = 2), `/api/health` returns 503 when MongoDB is disconnected, auth rate limit keyed by IP + email.
- Client: an empty `VITE_API_BASE` falls back to `/api`.
- Real Nexconn credentials removed from `.env.example` again (they live only in the git-ignored `.env`).
- Deployment: `vercel.json` (static build, `/api` rewrite to Render, SPA fallback, basic headers) and `render.yaml` (blueprint, secrets `sync:false`). Root `engines.node >=22.12`.
- Checks: typecheck, lint, 89 client + 29 server tests and both production builds pass; no secrets in tracked files or `client/dist`.
