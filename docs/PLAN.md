# CrewBridge — Architecture & Implementation Plan

Status: **approved — finalized 2026-10-31.** Milestone 1 is in progress. See [ARCHITECTURE.md](ARCHITECTURE.md) and [PROGRESS.md](PROGRESS.md).

## 0. Confirmed decisions

| # | Decision |
|---|---|
| D1 | TypeScript for frontend and backend |
| D2 | MongoDB Atlas free tier, accessed with Mongoose |
| D3 | The Nexconn application is activated and the App Key is available. **The data center is not confirmed**, so the client `areaCode` and the server base URL are both configurable through env and have no hard-coded default. |
| D4 | The App Secret is backend-only. It never appears in client code, `VITE_*` variables, logs or API responses. |
| D5 | Frontend deploys to Vercel and backend to Render |
| D6 | The Nexconn SDK is **not installed** until Milestone 4 |

### SDK compatibility check (2026-10-31)
- `@nexconn/chat@26.2.1` and `@nexconn/engine@26.2.1` are the latest stable releases (26.2.1 was released 2026-04-30). Newer `26.5.0-alpha.*` builds exist but are pre-release, so **we stay on 26.2.1**.
- The docs require `chat` and `engine` to be on the same version, and `chat` declares an exact peer dependency `@nexconn/engine@=26.2.1`.
- Both packages ship ESM (`index.mjs`) plus full `.d.ts` types, so they are compatible with Vite and TypeScript. The docs list Chrome, Firefox, Safari and Edge as supported.
- The `AreaCode` enum in the installed 26.2.1 build has `BJ=1`, `SG=2`, `NA=3`, `SA=5` and `OM=6` (**no `SG_B`**, and the typings document `SG` as the default). We still always pass an explicit area code, taken from the server's `NEXCONN_AREA`. *(Corrected in Milestone 4 after reading the installed `index.d.ts`.)*
- Server API hosts per data center: SG `api.sg-light-api.com`, NA `api.us-light-api.com`, SAU `api.sau-light-api.com`, each with an `api-b.` backup. These are selected by `NEXCONN_API_BASE` and `NEXCONN_API_BACKUP`.

### Frontend toolchain (current stable versions at time of writing)
React 19, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), React Router, Lucide, react-hook-form + zod, Vitest + Testing Library.

---

## 1. Repository inspection

| Item | Finding |
|---|---|
| `/Users/palak/crewbridge` | Empty directory, not a git repo |
| Node / npm | v24.3.0 / 11.4.2 ✅ |
| git | available |
| MongoDB (`mongod`, `mongosh`) | **Not installed** → see Risk R4 |
| `@nexconn/chat`, `@nexconn/engine` | Published on npm, latest **26.2.1**. `chat` declares peer dep `@nexconn/engine@=26.2.1` (exact pin) |

So this is a greenfield project. I installed the SDK into a scratch folder (outside the repo) only to read its TypeScript definitions (`index.d.ts`, ~5k lines), so every API named below has been checked against the shipped types as well as the docs.

---

## 2. Nexconn integration: what I verified

Sources: docs.nexconn.ai/chatsdk-web (init, connect, channel, message/send, typing-status, user/subscribe_online, group-channel), platform-chat-api (auth, base-url, user/register, group-channel/create), plus `@nexconn/chat@26.2.1/index.d.ts`.

### Client (browser): `@nexconn/chat` + `@nexconn/engine`

| Capability | Verified API |
|---|---|
| Init (once per app lifetime) | `NCEngine.initialize({ appKey, areaCode?, logLevel?, naviServer? })` |
| Connect | `NCEngine.connect({ token })` → `{ code, data: { userId } }`, `code === 0` is success. The SDK reconnects on its own. |
| Disconnect | `NCEngine.disconnect()` |
| Connection status | `NCEngine.addConnectionStatusHandler(id, new ConnectionStatusHandler({...}))` |
| Incoming messages | `NCEngine.addMessageHandler(id, new MessageHandler({ onMessageReceived({ messages }) {} }))` |
| Channel types | `DirectChannel(userId)`, `GroupChannel(channelId)`, plus Open, Community and System channels |
| Send text | `channel.sendMessage(new SendTextMessageParams({ text }))` |
| Send image/file | `Helper.createSendImageMessageParams(file)` / `Helper.createSendFileMessageParams(file)` → `channel.sendMediaMessage(params)`, with `onUploadProgress`, `onUploadComplete` and `onUploadError` callbacks |
| History | `BaseChannel.createMessagesQuery({ channelIdentifier, startTime, pageSize (1–100), isAscending })` → `loadNextPage()` |
| Channel list | `BaseChannel.createChannelsQuery({ pageSize })` (server-backed on Web, up to 1000 channels) |
| Unread | `channel.unreadCount`, `channel.clearUnreadCount()` |
| Typing | `directChannel.sendTypingStatus('RC:TxtMsg')`; receive with `NCEngine.addChannelHandler(id, new ChannelHandler({ onTypingStatusChanged }))`. Docs say this is mainly meant for **direct** channels. |
| Presence | `NCEngine.userModule.subscribeEvent({ userIds, subscribeType: SubscribeType.ONLINE_STATUS })`, with `UserHandler.onSubscriptionChanged`. Docs note it "may require enabling in Console" and has a per-user subscription cap. |
| Groups (client) | `GroupChannel.createGroup(...)`, `group.inviteUsers([...])`, `GroupChannel.createGroupMembersByRoleQuery(...)`, `GroupChannelHandler` |
| Message fields | `messageId`, `content`, `senderUserId`, `sentTime` (server time, used for ordering), `channelIdentifier`, `direction`, `sentStatus` |

### Server (App Server → Nexconn Server API)

- **Signature** (every request): headers `App-Key`, `Nonce` (≤18 chars), `Timestamp` (ms), `Signature = sha1(AppSecret + Nonce + Timestamp)` as lowercase hex. A failed signature returns HTTP 401.
- **Base URL** depends on the data center the app was created in: `api.sg-light-api.com` (Singapore), `api.us-light-api.com` (North America), `api.sau-light-api.com` (Saudi Arabia). Each has an `api-b.` backup. Docs recommend failing over to the backup after a 5 s timeout.
- **Issue user token:** `POST /v4/auth/access-token/issue` with `{ userId, name, avatarUrl? }` → `result.accessToken`. Requesting it again for the same user is allowed, and every valid token works. Rotating the App Secret invalidates all tokens.
- **Create group:** `POST /v4/group-channel/create` with `{ channelId, name, owner, userIds (≤30 per call), groupProfile? }`
- **Still to confirm in Milestone 4:** the exact Server API endpoints for *adding members to an existing group* and *sending a message as the system/organizer* (for urgent broadcasts). Both are in the docs sidebar, but I haven't opened them yet. I will not write code against them until I've read those pages.

### Integration decisions

1. **The App Secret stays on the server.** The browser only ever sees the App Key and a per-user access token, which it gets from `POST /api/chat/token` (requires JWT auth).
2. **Nexconn userId = MongoDB ObjectId hex.** It is 24 alphanumeric characters, which meets the "letters and numbers, ≤64 bytes" rule.
3. **The server owns group membership.** When an event or department is created, the backend calls Server API `group-channel/create` and stores the `channelId` in Mongo. Adding a volunteer to a department adds them to that group on the server. This avoids client-side invite or accept flows, which depend on group invite permissions.
4. **Channel ID scheme:** `evt<eventId>` (whole-event channel), `dep<departmentId>` (department channel), and `DirectChannel(<userId>)` for DMs. All of these are alphanumeric.
5. **`areaCode` must match the data center.** The SDK's `AreaCode` enum defaults to `BJ`, so a Singapore app has to pass `AreaCode.SG`. This becomes a `VITE_NEXCONN_AREA` setting.
6. **No fake messaging.** If chat isn't configured (no keys), the Messages page shows an honest "Chat not configured" state. It does not fall back to a local mock.

---

## 3. Proposed stack

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** (client and server) | The SDK ships full `.d.ts` files, so type-checking prevents invented method calls |
| Client | React 18 + Vite + React Router + Tailwind CSS + Lucide | As requested |
| Client data | TanStack Query | Caching, loading and error states, and optimistic task updates |
| Forms | react-hook-form + zod | Validation schemas shared with the server |
| Charts | Recharts, used **once** (task completion over time) | Only where it adds information |
| Server | Node + Express + Mongoose | As requested |
| Auth | JWT in an **httpOnly, SameSite cookie**, bcrypt hashing, role middleware | No tokens in localStorage |
| Validation | zod on every route body, query and params | |
| App notifications (real-time) | Server-Sent Events from Express (`/api/notifications/stream`) | Our own task/assignment events are separate from chat. Nexconn handles chat only. |
| Security middleware | helmet, cors (allowlisted origin), express-rate-limit on auth | |
| Tests | Vitest (client and server) + Supertest (API) + Playwright smoke test (Milestone 6) | |

---

## 4. Folder structure

```
crewbridge/
├─ package.json              # npm workspaces: client, server, shared
├─ .gitignore                # .env*, node_modules, dist
├─ .env.example              # documented, no secrets
├─ docs/PLAN.md
├─ shared/                   # zod schemas + types used by both sides
│  └─ src/{auth,event,task,volunteer,notification}.ts
├─ server/
│  └─ src/
│     ├─ index.ts            # bootstrap
│     ├─ app.ts              # express app (exported for Supertest)
│     ├─ config/env.ts       # validated env (zod) – fails fast
│     ├─ db/connect.ts
│     ├─ models/             # User, Event, Department, Task, Assignment, Notification, Activity
│     ├─ middleware/         # auth, requireRole, validate, errorHandler
│     ├─ modules/
│     │  ├─ auth/            # routes, controller, service
│     │  ├─ events/
│     │  ├─ departments/
│     │  ├─ tasks/
│     │  ├─ volunteers/
│     │  ├─ dispatch/        # rule-based matcher (pure fn + tests)
│     │  ├─ notifications/   # CRUD + SSE hub
│     │  ├─ analytics/       # aggregation queries (real counts only)
│     │  └─ chat/            # POST /api/chat/token, channel bootstrap
│     ├─ integrations/nexconn/
│     │  ├─ signer.ts        # sha1 signature
│     │  ├─ client.ts        # fetch wrapper + primary/backup failover
│     │  ├─ users.ts         # issueAccessToken
│     │  └─ groups.ts        # createGroup, addMembers (after docs check)
│     └─ seed/demo.ts        # demo workspace, every doc flagged isDemo
└─ client/
   └─ src/
      ├─ main.tsx, App.tsx, routes.tsx
      ├─ styles/             # tailwind entry, design tokens
      ├─ components/ui/      # Button, Input, Select, Card, Badge, Avatar, Modal,
      │                      # Drawer, Tabs, Dropdown, Toast, Skeleton, EmptyState
      ├─ components/layout/  # AppShell, Sidebar, Topbar, MobileNav, PublicLayout
      ├─ lib/api/            # typed fetch client + per-resource modules
      ├─ lib/chat/           # ── Nexconn SDK layer (UI never imports @nexconn directly)
      │  ├─ engine.ts        # initialize/connect/disconnect singleton
      │  ├─ adapters.ts      # SDK Message/Channel → app ChatMessage/ChatChannel
      │  ├─ ChatProvider.tsx # context: status, handlers registration
      │  └─ hooks.ts         # useChannels, useMessages, useSendMessage, useTyping, usePresence
      ├─ features/
      │  ├─ landing/  auth/  dashboard/  events/  tasks/
      │  ├─ volunteers/  messages/  dispatch/  notifications/
      │  ├─ analytics/  settings/  volunteer-home/
      └─ hooks/, utils/
```

---

## 5. Data model (Mongo)

- **User**: name, email (unique), passwordHash, role (`organizer` | `leader` | `volunteer`), avatarUrl, skills[], availability (`available` | `busy` | `unavailable`), availabilityUpdatedAt, isDemo
- **Event**: title, description, startAt, endAt, location, coverUrl, status (`draft` | `upcoming` | `live` | `completed`), organizerId, memberIds[], chatChannelId, isDemo
- **Department**: eventId, name, description, leaderId, memberIds[], chatChannelId
- **Task**: eventId, departmentId, title, description, priority (`low` | `medium` | `high` | `urgent`), status (`todo` | `in_progress` | `completed`), assigneeId?, requiredSkills[], dueAt, createdBy, isOpen (shown in "available tasks"), history[]
- **DispatchRequest**: taskId, mode (`direct` | `broadcast`), candidateIds[] with reasons, offeredTo[], acceptedBy?, status
- **Notification**: userId, type (`task_assigned` | `urgent` | `deadline` | `task_accepted` | `dispatch_offer` | `message`), payload, readAt
- **Activity**: actor, verb, target, eventId, createdAt (feeds "Recent activity")

Permissions are enforced in middleware and services:
- Organizers have full control over their own events.
- Leaders manage tasks and members within their own department.
- Volunteers can read their events, accept or update their own tasks, and set their own availability.

---

## 6. How real-time works

```
Browser A ──JWT──► Express /api/chat/token ──signed──► Nexconn Server API (issue token)
    │                                                   ▲
    │ NCEngine.connect(token)                           │ group-channel/create (on event/dept create)
    ▼                                                   │
 Nexconn cloud ◄──────── messages / typing / presence ────────► Browser B
```

- **Chat** (messages, history, typing, presence, unread counts) goes **directly between the browser and Nexconn**. Our server never relays message content.
- **Operational events** (task assigned, dispatch offer, accepted) are written to Mongo and pushed to the browser over **SSE**. The notification bell and the Kanban board update live.
- **Urgent broadcast:** the dispatch flow posts a message into the relevant department's Nexconn group, so the chat shows it too. It goes through the Server API if a send-as-system endpoint exists. Otherwise the organizer's client sends it with `GroupChannel.sendMessage`.
- **Task context in chat:** the right-hand panel loads the channel's related event and tasks from our API using the `chatChannelId` mapping.

**Demo for judges:** two browser profiles (organizer and volunteer) chatting in a department channel and a DM, with live typing and presence, and a dispatch offer accepted live.

---

## 7. Smart dispatch (rule-based, transparent)

Pure function `rankCandidates(task, volunteers, workload)`:

1. **Hard filters:** availability is `available`, the volunteer is a member of the event, and they aren't the current or previous assignee who dropped the task.
2. **Score:**
   - same department: +40
   - each required skill matched: +15
   - each active task: −10
   - completed tasks in this event: +2 each, capped at +10
3. **Each candidate gets human-readable reasons**, for example "Available now · Registration team · Has *check-in* skill · 1 active task".
4. **The organizer chooses:** assign directly to one person, or broadcast to the top N candidates. The first to accept wins (an atomic `findOneAndUpdate` on `acceptedBy: null`). Everyone else's offer is withdrawn.
5. The task status and assignee update, an Activity entry is logged, and notifications go out over SSE.

The UI labels this **"Rule-based match"**, never "AI".

---

## 8. Milestones (each ends with run + tests + summary)

| # | Scope | Done when |
|---|---|---|
| **1** | Workspaces, TS, Tailwind tokens, UI kit, routing, landing page, login/register/role-select UI (client validation, loading and error states) | `npm run dev` serves the landing and auth pages; lint, typecheck and build pass; UI kit unit tests pass |
| **2** | App shell (sidebar, topbar, mobile nav), organizer overview, events list + workspace + create/edit, Kanban (create/edit/assign/drag), volunteer directory with filters | Screens built against the typed API layer. Until Milestone 3 lands they run against an explicitly labelled **demo fixture adapter**, which is then removed. |
| **3** | Express, Mongo, auth (cookie JWT), RBAC, all REST APIs, seed script, client switched to the live API | Supertest suite covers auth, RBAC and the task lifecycle; the full flow works in the browser |
| **4** | Nexconn: token endpoint, server group creation, `lib/chat` layer, three-pane Messages UI, history paging, typing (DM), presence, attachments, unread counts, connection status banner | Verified manually with two real users exchanging messages; adapter unit tests pass |
| **5** | Dispatch flow, SSE notifications + notification center, volunteer dashboard, leader-scoped views, analytics page (real aggregations) | Dispatch matcher tests pass; end-to-end demo script works |
| **6** | Responsive pass, accessibility pass, Playwright smoke test, README, deployment (client on Vercel, server on Render or Railway, MongoDB Atlas) | Deployed URLs work, and the README includes the judge walkthrough |

I won't call a milestone complete until it has actually been run and tested. Any gaps will be listed explicitly.

---

## 9. Design system (summary)

- **Tokens:**
  - `bg #F8F9F7`, `surface #FFFFFF`
  - `primary #236B52` (hover `#1C5843`), `sage #E8F0EA`
  - `text #202824`, `muted #84908A`, `border #E8ECE8`
  - success `#3F8F6B`, warning `#C98A2B` / `#FBF3E4`, danger `#C8614F` / `#FBECE9`
- **Muted text contrast:** `#84908A` on white is about 3.3:1. That is fine for large or secondary labels but fails AA for body text, so small text will use a darker `muted-strong #66726C`.
- **Type:** Inter, sizes 12/13/14/15/18/22/28, weights 400/500/600 only.
- **Shape:** radius 10 for controls, 12 for cards, 16 for modals. Borders are 1px. Shadow is `0 1px 2px rgb(16 24 20 / .04)`, plus one elevated level for popovers.
- **Motion:** 150 ms ease-out on hover and focus only, and it respects `prefers-reduced-motion`.
- **Theme:** light only, as specified.

---

## 10. Risks & dependencies

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Nexconn credentials needed:** App Key, App Secret and the app's data center | Needed by Milestone 4. You'll need to create the app in console.nexconn.ai. |
| R2 | Online-status subscription may need enabling in the Console, and it has a subscriber cap | Enable it in the Console. The UI degrades to "presence unavailable" rather than faking it. |
| R3 | Typing indicators are documented mainly for DMs | Show typing in DMs. In group channels, show it only if testing confirms it works. |
| R4 | MongoDB isn't installed locally | Use MongoDB Atlas free tier (also used for deployment), or `brew install mongodb-community` |
| R5 | `@nexconn/chat` pins `@nexconn/engine` exactly | Pin both to `26.2.1` |
| R6 | Server endpoints for adding members and sending system messages not yet read | Read those docs at the start of Milestone 4. A client-side `inviteUsers` exists as a fallback. |
| R7 | Group calls take at most 30 `userIds` per request | Batch the calls |
| R8 | Secret rotation invalidates tokens | Token endpoint re-issues on a connect failure |
| R9 | Cross-site cookies between Vercel and Render | Proxy `/api` through Vercel rewrites so it's same-origin, or use `SameSite=None; Secure` |

---

## 11. Open items

- **Nexconn data center:** confirm it in the Nexconn Console before Milestone 4, then set `VITE_NEXCONN_AREA`, `NEXCONN_API_BASE` and `NEXCONN_API_BACKUP`.
- **MongoDB Atlas cluster and connection string:** needed before Milestone 3.
