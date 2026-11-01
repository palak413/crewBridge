# CrewBridge — Architecture

This document describes the system as it is designed. [PLAN.md](PLAN.md) covers sequencing, and [PROGRESS.md](PROGRESS.md) covers what is actually built.

## System overview

```
┌─────────────────────────┐        HTTPS (cookie JWT)        ┌──────────────────────────┐
│  client/ (Vercel)       │ ───────────────────────────────► │  server/ (Render)        │
│  React 19 + Vite + TS   │ ◄─────── SSE notifications ───── │  Express + TS + Mongoose │
│                         │                                  │                          │
│  lib/chat  ─────────────┼──► Nexconn cloud (WebSocket)     │  integrations/nexconn ───┼──► Nexconn Server API
│  (only SDK importer)    │     messages · typing · presence │  (signed, App Secret)    │    token issue · groups
└─────────────────────────┘                                  └────────────┬─────────────┘
                                                                          │
                                                                  MongoDB Atlas (M0)
```

## Trust boundaries & secrets

| Secret / config | Lives in | Exposed to browser? |
|---|---|---|
| `NEXCONN_APP_SECRET` | Server env only (`.env` locally, Render in production) | **Never.** It's used only to sign Server API calls (`server/src/integrations/nexconn/client.ts`). |
| `NEXCONN_APP_KEY` | Server env | Yes, through `POST /api/chat/session`. The App Key is public by design (the SDK needs it). |
| `NEXCONN_AREA` | Server env (`SG` \| `NA` \| `SA` \| `OM`) | Yes, through the session; the client maps it to `AreaCode.*`. The app's data center is **SG**, verified against the Server API. |
| `NEXCONN_API_BASE` / `NEXCONN_API_BACKUP` | Server env (optional) | No. Defaults are derived from `NEXCONN_AREA`; OM needs them set explicitly. |
| `MONGODB_URI` | Server env | No |
| `JWT_SECRET` | Server env | No |
| Nexconn user access token | Issued per session by `POST /api/chat/session` | Only to that user, held in memory (not localStorage) |

Rules:
- Any `VITE_*` variable is public. A CI check will grep the client build for `SECRET`.
- `.env` files are git-ignored, and `.env.example` documents every variable without real values.
- The server validates its env with zod at boot and refuses to start if anything is missing.

## Frontend

```
client/src/
├─ app/            router, providers, route guards
├─ styles/         Tailwind entry + design tokens (@theme)
├─ components/
│  ├─ ui/          primitives: Button, Input, PasswordInput, Field, Badge, Avatar, Card,
│  │               Alert, Spinner, EmptyState, Logo, Kbd
│  └─ layout/      PublicHeader, PublicFooter, AppShell, Sidebar, Topbar, MobileNav
├─ features/       one folder per product area (landing, auth, dashboard, …)
│  └─ <feature>/   pages, feature components, schemas, api hooks
├─ lib/
│  ├─ api/         typed fetch client (ApiError, credentials: 'include')
│  ├─ chat/        Nexconn SDK adapter layer (Milestone 4)
│  └─ cn.ts        className helper
└─ test/           test setup
```

Principles:
- **Features don't import each other.** Shared pieces move into `components/` or `lib/`.
- **UI never touches the SDK directly.** `features/messages` uses hooks from `lib/chat`, and `lib/chat` maps SDK `Message` and `BaseChannel` objects into app-level `ChatMessage` and `ChatChannel` types. Swapping SDK versions then only touches `lib/chat`.
- **Server state goes through TanStack Query** (from Milestone 2/3), and local UI state uses component state. There's no global store unless one becomes necessary.
- **Forms use react-hook-form with zod schemas.** From Milestone 3 those schemas live in `shared/` and are reused by the server.

### Data layer (Milestone 2+)

```
lib/data/
├─ types.ts, schemas.ts, seed.ts   re-exports from @crewbridge/shared (shared with the server)
├─ source.ts           DataSource interface — the only contract the UI depends on
├─ httpSource.ts       live source: the CrewBridge REST API
├─ localDemoSource.ts  demo source: localStorage, same rules/errors as the API
├─ permissions.ts      client mirror of the API's role rules (hides actions only)
├─ dataContext.ts      context + QueryClient factory
├─ DataProvider.tsx    provides source + cache; cross-tab sync for the demo source
├─ queries.ts          TanStack Query hooks (all reads/writes go through here)
└─ labels.ts           display metadata (status, priority, availability, covers)
```

The `AppShell` route mounts `DataProvider` and `ToastProvider`, and every mutation invalidates the `cb` query namespace. `AppShell` picks the source from `lib/session/mode.ts` (`crewbridge.mode` in localStorage):

- `live` → `httpSource`, wrapped in `RequireSession`. It confirms `GET /auth/me` and sends the user to `/login` on any 401.
- `demo` → `localDemoSource`, with the demo banner shown.
- unset → redirect to `/login`. Login and registration set `live`; "Explore the demo workspace" sets `demo`; Sign out clears it.

### Design tokens (`client/src/styles/index.css`)

| Token | Value | Use |
|---|---|---|
| `canvas` | `#F8F9F7` | App background |
| `surface` | `#FFFFFF` | Cards, sidebar, inputs |
| `primary` / `primary-hover` | `#236B52` / `#1C5843` | Primary actions, active nav |
| `sage` / `sage-strong` | `#E8F0EA` / `#D5E4D9` | Selected states, soft fills |
| `ink` | `#202824` | Main text |
| `muted` | `#84908A` | Secondary labels, ≥14px or non-essential only |
| `muted-strong` | `#66726C` | Small secondary text (passes AA on white) |
| `line` | `#E8ECE8` | Borders and dividers |
| `success` / `warning` / `danger` | `#3F8F6B` / `#B7791F` / `#C2553F` | Status, each with a soft tint |

- **Radii:** 10 (controls), 12 (cards), 16 (modals and large panels).
- **Shadows:** `xs` hairline, `sm` card, `pop` for menus. Only one elevated level is used.
- **Type:** Inter, weights 400/500/600.

## Backend (Milestone 3)

```
shared/src/                  types, zod schemas, auth schemas, demo seed (used by client + server)
server/src/
├─ index.ts, app.ts          bootstrap; helmet, CORS allow-list, JSON body limit, cookie parser
├─ config/env.ts             zod-validated env; production requires MONGODB_URI + JWT_SECRET (≥32 chars)
├─ db/connect.ts             Mongoose; dev without MONGODB_URI → temporary in-memory MongoDB (auto-seeded)
├─ models/                   User, Event, Department, Task, Activity (toJSON: id strings, no secrets)
├─ auth/session.ts           JWT cookie issue/verify, requireAuth, requireRole, CSRF header guard
├─ auth/access.ts            visibility + ownership rules (organizer / department leader / self)
├─ routes/                   auth, events, departments, people, tasks (+ /activity, /health in app.ts)
└─ seed/                     seedDemo (shared seed → Mongo), run.ts (`npm run seed [-- --reset]`)
```

- **Auth:** passwords are hashed with bcrypt (cost 12). The session is an HS256 JWT valid for 7 days, stored in the `cb_session` cookie (`httpOnly`, `SameSite=Lax`, `Secure` in production).
  - Login and registration are rate-limited to 20 attempts per 15 minutes.
  - Unknown emails take as long as wrong passwords, so timing doesn't reveal which accounts exist.
  - Registering with an email an organizer already added claims that directory entry.
- **CSRF:** every non-GET request must send `X-Requested-With: CrewBridge`. Combined with the CORS allow-list (`CLIENT_ORIGIN`), this blocks cross-site requests.
- **API:**

  | Area | Endpoints |
  |---|---|
  | Auth | `POST /api/auth/register \| login \| logout`, `GET /api/auth/me` |
  | Events | `GET\|POST /api/events`, `GET\|PUT\|DELETE /api/events/:id`, `POST /api/events/:id/members`, `DELETE /api/events/:id/members/:personId`, `POST /api/events/:id/departments` |
  | Departments | `GET /api/departments?eventId`, `PUT\|DELETE /api/departments/:id`, `PUT /api/departments/:id/members` |
  | People | `GET\|POST /api/people`, `PUT /api/people/:id`, `PATCH /api/people/:id/availability` |
  | Tasks | `GET /api/tasks?eventId&departmentId&assigneeId`, `POST /api/tasks`, `PUT\|DELETE /api/tasks/:id`, `PATCH /api/tasks/:id/status` |
  | Other | `GET /api/activity?limit`, `GET /api/health` |

- **Visibility:** you see events you organize or belong to, and everything inside them. The people directory shows yourself, everyone who shares an event with you, and anyone you added. Records you can't see return 404.
- **Permissions:**
  - **Organizer:** creates events; fully manages events they organize.
  - **Team Leader:** edits the name and description of departments they lead, sets their members, and creates or edits tasks in those departments.
  - **Volunteer:** reads their events and updates the status of tasks assigned to them.
  - **Everyone:** sets their own availability.
  - Only an account's owner can change its email.
- **Errors:** every error returns JSON shaped `{ error: { code, message, fields? } }`, using the codes VALIDATION (422), UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED and INTERNAL. Stack traces are never sent to the client.

## Real-time model (Milestone 4)

| Concern | Transport | Source of truth |
|---|---|---|
| Chat messages and history | Nexconn SDK, browser ↔ Nexconn (`GroupChannel`/`DirectChannel.sendMessage`, `BaseChannel.createMessagesQuery`) | Nexconn |
| Typing indicators (direct messages) | `DirectChannel.sendTypingStatus` / `ChannelHandler.onTypingStatusChanged`, cleared after 6 s | Nexconn (transient) |
| Online presence | `userModule.subscribeEvent(ONLINE_STATUS, expiry 24 h)`, then `getSubscribeUsersOnlineStatus` on `onSubscriptionChanged` | Nexconn |
| Channel membership | Server API `group-channel/create\|join\|leave\|dismiss` | CrewBridge. Mongo records who is joined (`chatMemberIds`); Nexconn enforces it |
| Task, dispatch and notification events | SSE from Express (Milestone 5) | Mongo |

**Flow:**
1. Opening Messages calls `POST /api/chat/session`.
2. The server reconciles the user's authorized group channels, creating groups on first use and joining or removing members.
3. It issues an access token (`/v4/auth/access-token/issue`) and returns `{ appKey, area, token, channels, contacts }`.
4. The browser calls `NCEngine.initialize({ appKey, areaCode })` and then `NCEngine.connect({ token })`.

**Authorization:** only the server adds or removes group members.
- Event channels contain the organizer plus the event's members.
- Department channels contain the organizer, the department's members and its leader.
- Removing someone from an event or department removes them from those groups. Deleting an event or department dismisses its groups.
- A failed Nexconn call never blocks the user's action; the next reconcile repairs it.
- Direct messages are offered only to people in the user's directory.

**Client layer:** `client/src/lib/chat/` is the only code that imports `@nexconn/*`:
- `nexconnTransport.ts`: the SDK adapter.
- `demoTransport.ts`: local-only messages in demo mode, clearly labelled as such.
- `chatStore.ts`: one connection per tab, threads, unread counts, typing, presence and optimistic sends with retry.

The SDK is loaded as a separate chunk, only when a live user opens Messages.

**IDs:** `evt<eventId>` and `dep<departmentId>` for groups. Direct messages use `DirectChannel(<userId>)`. The Nexconn userId is the 24-character hex Mongo ObjectId.

## Deployment

- **Vercel** builds `client`. `vercel.json` rewrites `/api/:path*` → `https://<render-app>/api/:path*` and falls back to SPA routes for everything else.
- **Render** runs a Node web service from `server` (`npm run build && npm start`), with a health check at `/api/health`.
- **MongoDB Atlas M0** with its network access list limited to Render.
