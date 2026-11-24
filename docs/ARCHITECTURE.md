# Architecture

VidyaGram is an npm-workspaces monorepo. The browser app and the API share one
domain model, one set of pure helpers and one sample dataset, so a change to a
type or a rule only has to be made once.

```text
VidyaGram/
├── apps/
│   ├── web/        Vite + React + TypeScript single-page app (the UI)
│   └── api/        Fastify 5 + SQLite JSON API
├── packages/
│   └── shared/     Domain types, pure helpers, seed data, wire contracts
├── docs/           Audit, architecture, API reference, roadmap, integrations
└── .github/        CI workflow
```

## 1. Workspace boundaries

| Package | May import | Must not import |
| --- | --- | --- |
| `packages/shared` | nothing from `apps/*` | DOM APIs, Node built-ins, `fetch` |
| `apps/api` | `@vidyagram/shared` | React, DOM |
| `apps/web` | `@vidyagram/shared` | `apps/api` source, Node built-ins |

`packages/shared` is consumed from source (`exports` point at `.ts` files). Vite
and `tsc` both resolve it through a path alias, so there is no build step for
the shared package during development.

`packages/shared` exposes four subpaths:

- `@vidyagram/shared` — types and the main barrel (`index.ts`)
- `@vidyagram/shared/types` — the domain model
- `@vidyagram/shared/utils` — pure helpers (dates, grades, formatting, hashing)
- `@vidyagram/shared/seed` — the sample dataset and its builders
- `@vidyagram/shared/contracts` — request/response wire types

## 2. Request lifecycle (API)

```text
browser ──HTTP──▶ Fastify
                    │ onRequest      origin check for unsafe methods
                    │ preHandler     optionalAuth / requireAuth / requireRole
                    │ handler        Zod validation → repository → scoped read model
                    │ onSend/error   { ok, data } / { ok: false, error }
                    ▼
                 SQLite (WAL)
```

`apps/api/src/app.ts` wires the plugins:

- `@fastify/cookie` — session cookie parsing.
- `@fastify/helmet` — security headers (CSP is left to the web host).
- `@fastify/cors` — credentials allowed only for configured origins.
- `@fastify/rate-limit` — 300 req/min globally, tighter on auth routes.
- A global `onRequest` hook that rejects unsafe requests carrying an
  un-allowlisted `Origin` header (`403 csrf_origin`).

### Hooks must be async

Fastify 5 only advances a hook chain when the hook is `async` or accepts a
`done` callback. A synchronous `preHandler` that returns `undefined` silently
stalls the request forever. All hook factories in `apps/api/src/lib/auth.ts`
therefore return `async` functions. Keep it that way.

## 3. Persistence

`better-sqlite3` with WAL, foreign keys and a 5 s busy timeout.

Instead of a hand-written mapper per table, `apps/api/src/db/schema.ts` declares
the physical columns for each collection and `apps/api/src/db/client.ts` uses
that metadata to:

- convert camelCase domain objects to snake_case rows (and back),
- serialise `json` columns and `bool` columns,
- build parameterised `WHERE` clauses,
- provide `selectAll`, `selectOne`, `countRows`, `upsert`, `updateRow`,
  `deleteRows` and `transaction`.

`apps/api/src/db/migrate.ts` creates the tables and indexes idempotently, and
records the schema version in a `meta` table. Unknown tables or columns throw,
which keeps typos from becoming silent full-table scans.

### Seed data

`packages/shared/src/seed` builds the demo school relative to today's date. The
API seeder (`apps/api/src/db/seed.ts`) calls the same builder and hashes the
demo password with scrypt. `npm run db:seed` and `npm run db:reset` are thin
scripts around it. Seeding is skipped when the database already has users.

## 4. Authentication and sessions

- Passwords: scrypt with a per-user random salt, stored as
  `passwordHash` + `salt` + `passwordAlgo` (`scrypt`). Verification uses
  `timingSafeEqual`.
- Sessions: a random 32-byte token. Only its SHA-256 hash is stored in
  `auth_sessions`, so a database leak does not hand out live sessions.
- Cookie: `vg_session`, `httpOnly`, `SameSite=Lax`, `Secure` in production,
  7-day expiry (`SESSION_DAYS`). `Authorization: Bearer <token>` is also
  accepted for API clients.
- Logout deletes the session row and clears the cookie.
- Disabling a user deletes all of their sessions.
- Login failures return the same message whether or not the account exists, and
  `auth/login` is rate limited to 10 attempts per 5 minutes per IP.

## 5. Authorisation

Two layers, both server-side:

1. **Route level** — `requireAuth(db)` proves a live session;
   `requireRole('teacher', 'admin')` narrows by role.
2. **Record level** — `apps/api/src/lib/access.ts` answers the real questions:
   `canViewClass`, `canManageClass`, `canViewStudent`, `visibleClassIds`,
   `visibleStudentIds`, `guardianChildIds`, `classRosterIds`.

| Actor | Sees |
| --- | --- |
| Student | own records, own classes, own guardians' links |
| Teacher | records of students in classes they own or teach |
| Parent | only children with an **approved** `parent_links` row |
| Admin | their own school only |

A class code joins a class. It never grants access to another student's
records.

## 6. The bootstrap read model

The browser boots from `GET /api/v1/bootstrap`. `buildBootstrap` assembles a
`DB`-shaped snapshot scoped to the caller:

- Anonymous callers get public schools, the four demo accounts (no credentials)
  and platform config — nothing else.
- Signed-in callers get their classes, rosters, sessions, recordings,
  resources, quizzes, attempts, attendance, assessments, marks, doubts,
  announcements, notifications, downloads, bookmarks, parent links, badges and
  (for admins) the audit log.
- Other users' e-mail addresses, phone numbers, guardian names, invite codes and
  consent timestamps are blanked unless the caller is that user, their approved
  guardian, or an admin.
- Quiz answer keys and explanations are removed while results are withheld
  (`showResults` + `dueAt` + `resultsReleased`).
- Credential columns are never serialised.

Because the snapshot has the same shape as the demo dataset, the existing UI
renders it without per-screen changes.

## 7. Browser data modes

`apps/web/src/lib/store.tsx` runs in one of two modes:

| Mode | When | Where data lives |
| --- | --- | --- |
| `demo` | `api.enabled` is false, or the API cannot be reached | `localStorage` (`vidyagram.db.v4`) |
| `server` | `GET /bootstrap` succeeded | Server; the browser holds a read snapshot |

Boot order: if the API is enabled, call `/bootstrap`; on any network failure fall
back to the local seed. The UI shows a `DataModeNotice` on the sign-in,
sign-up and in-app screens stating which mode is active, so the app never
implies a server save when the data is on the device.

Server mode currently wires:

- sign-in, sign-up, sign-out and session restore,
- the role-scoped read snapshot (and a `refresh()` to re-read it),
- profile updates (`PATCH /me`),
- server-graded quiz attempts (`POST /quizzes/:id/attempts`),
- quiz result release (`POST /quizzes/:id/release`).

Every other screen still edits the local snapshot. That is a known gap, stated
in the UI and tracked in [ROADMAP.md](ROADMAP.md).

## 8. Error handling

Every API response uses one envelope:

```json
{ "ok": true, "data": { } }
{ "ok": false, "error": { "code": "forbidden", "message": "…", "requestId": "…" } }
```

The browser client turns a non-2xx response into an `ApiRequestError` carrying
`code`, `message` and `status`. `status === 0` means the request never reached
the server. The store maps those to user-facing i18n keys, so a failed sign-in
never silently looks like a successful one.

## 9. Testing

- `apps/api/test/api.test.ts` boots the real Fastify app against an in-memory
  SQLite database and exercises auth, scoping, attendance, marks, quiz grading,
  guardian approval and admin safety (15 tests).
- Web typechecking and the production build run in CI.
- No component tests yet; see the roadmap.

## 10. Configuration

| Where | What |
| --- | --- |
| `apps/web/public/config.js` | Public runtime config: API base URL, feature flags, integration status. Never secrets. |
| `apps/api/.env` | Server config: port, database path, allowed web origins, demo mode, session length. |
| `apps/api/.env.example` | Documented development defaults. |

In development the Vite dev server proxies `/api` to `http://localhost:4000`, so
the default `baseUrl: '/api/v1'` is same-origin and needs no CORS. In
production, serve the web app and API on the same site (reverse proxy) or set
`baseUrl` to the API origin and add the web origin to `WEB_ORIGIN`.
