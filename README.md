# VidyaGram

**Learning for every village, every child.**
A multilingual, role-based learning platform for government schools (Classes 1–12), built by **Team AROHA**.

VidyaGram is now a working monorepo: a React single-page app plus a real Fastify + SQLite API.
Sign-in, sessions and the role-scoped read model run on the server. Quiz attempts are graded server-side.
Screens that are still browser-local say so in the interface — the project never claims a server save it did not make.

---

## Quick start

Requirements: Node 20.11+ (tested on Node 22) and npm 9+.

```bash
npm install
npm run dev        # API on http://localhost:4000, web on http://localhost:5173
```

The Vite dev server proxies `/api` to the API, so the default configuration needs no CORS setup.
The API creates `apps/api/data/vidyagram.db` on first boot and seeds the demo school automatically
(`SEED_ON_BOOT=true`).

Other root scripts:

```bash
npm run build      # production build for web + API
npm run typecheck  # TypeScript across all workspaces
npm run test       # API integration tests (15)
npm run db:seed    # seed if the database has no users
npm run db:reset   # drop and rebuild the demo data
```

Run one side only with `npm run dev:web` or `npm run dev:api`.

### API configuration

Copy `apps/api/.env.example` to `apps/api/.env` to change the port, database path, allowed origins,
session length or demo mode. Never commit real secrets. Runtime browser configuration lives in
[`apps/web/public/config.js`](apps/web/public/config.js) and is public by design.

---

## Demo accounts

Every sample account uses the password **`demo1234`**. These accounts are also listed on the sign-in screen.

| Role | Name | Email |
| --- | --- | --- |
| Student | Aarav Sharma | `aarav@vidyagram.demo` |
| Teacher | Meera Iyer | `meera@vidyagram.demo` |
| Parent / Guardian | Sunita Sharma | `sunita@vidyagram.demo` |
| Administrator | Rakesh Verma | `rakesh@vidyagram.demo` |

The sample school is **Govt. Higher Secondary School, Rampur**, with Class 8-A join code **`VIDYA-8A-2026`**.

> All people, marks, attendance records, resources, scholarships and devices in this repository are
> **sample data**. Do not enter real personal information.

---

## Data modes

The app detects at boot whether the API is reachable and shows a notice telling you where data lives.

| Mode | When | Where data lives |
| --- | --- | --- |
| **Server** | `GET /api/v1/bootstrap` succeeded | SQLite on the API; the browser holds a role-scoped snapshot |
| **Sample on device** | API disabled or unreachable | `localStorage` (`vidyagram.db.v4`) |

Set `api.enabled = false` in `public/config.js` for a purely on-device demo, or leave it on and stop the
API to exercise the fallback. The browser never writes server snapshots to `localStorage`.

Server mode currently covers:

- sign-in, sign-up, sign-out and session restore,
- the role-scoped read snapshot and `refresh()`,
- profile updates (`PATCH /me`),
- server-graded quiz attempts and quiz result release.

Everything else still edits the local snapshot. That is a known gap, stated in the UI and tracked in
[`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## What works

### Student
- Dashboard with next live class, pending quizzes, materials, recordings, attendance, marks, badges and announcements.
- Join a class with a class code (joining a class does not unlock other students' records).
- Live classes, recordings, learning materials, quizzes, virtual labs and the digital library.
- Quiz attempts with countdown, auto-grading, result visibility rules and offline queueing.
- Interactive labs (fractions, circuits, pendulum, pH, place value) with checks, points and badges.
- Doubt support, AI study assistant (on-device demo), scholarships, downloads, notifications, feedback and profile.
- Offline downloads with sizes, a demo 5 MB quota, outbox sync when connectivity returns.

### Teacher
- Class overview, attendance marking and CSV export, low-attendance follow-up.
- Create assessments, enter marks, publish results and notify students/guardians.
- Create and publish quizzes, review attempts and release results.
- Upload resources, record/schedule classes, answer doubts, send class announcements.
- AI lesson/quiz drafting on-device, clearly labelled as a demo assistant.

### Parent / Guardian
- Only sees a child after an approved guardian link.
- Attendance, marks, announcements, scholarships and feedback for the linked child.
- Link a child by invitation code or approval request (teacher/admin approval required).
- Read-only class view; cannot open another student's records.

### Administrator
- School records, users and roles, classes and join codes, content publishing.
- Guardian-link approvals, scholarship listing maintenance, feedback inbox.
- Platform settings, integration status, audit trail and demo reset.
- CSV exports for users and attendance.

### Cross-cutting
- Six-language interface selector (English, Hindi, Marathi, Bengali, Tamil, Telugu) with published coverage percentages and English fallback.
- Role-aware navigation, route guards and a documented permission matrix on the Privacy & Safety page.
- Responsive layouts, minimum touch targets, visible focus states, skip link, labelled icon buttons.
- Text-size, reduced-motion and low-data preferences persisted per account.
- Loading, empty, error, success and offline states. Toasts never claim a cloud action succeeded when no integration is configured.

---

## Project structure

```text
VidyaGram/
├── apps/
│   ├── web/                    Vite + React + TypeScript single-page app
│   │   ├── public/config.js    Public runtime config (no secrets)
│   │   └── src/
│   │       ├── App.tsx         Routes, guards and accessibility preferences
│   │       ├── components/     Layout, design system, shared cards
│   │       ├── lib/
│   │       │   ├── api.ts      Browser API client
│   │       │   ├── store.tsx   Auth, data mode, persistence, outbox
│   │       │   ├── access.ts   Privacy gates and derived statistics
│   │       │   ├── offline.ts  Download and quota helpers
│   │       │   └── i18n/       Language dictionaries
│   │       └── pages/          Auth, dashboards, admin and feature screens
│   └── api/                    Fastify 5 + SQLite JSON API
│       ├── src/
│       │   ├── app.ts          Plugins, security headers, origin check
│       │   ├── db/             Schema metadata, migrations, seeding
│       │   ├── lib/            Auth, access rules, bootstrap read model
│       │   └── routes/         auth, bootstrap, academy, community, admin
│       └── test/api.test.ts    Integration tests
├── packages/
│   └── shared/                 Domain types, pure helpers, seed data, contracts
├── docs/                       Audit, architecture, API, roadmap, integrations
└── .github/workflows/ci.yml    Install → typecheck → API tests → web build
```

Workspace boundaries: `packages/shared` imports nothing from `apps/*` and uses no DOM or Node APIs.
`apps/web` never imports API source. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## API

Base path: `/api/v1`. Every response uses one envelope:

```json
{ "ok": true,  "data": { } }
{ "ok": false, "error": { "code": "forbidden", "message": "…", "requestId": "…" } }
```

Authentication is an opaque, DB-backed session token in an `httpOnly` `SameSite=Lax` cookie
(`vg_session`). Passwords are hashed with scrypt. `Authorization: Bearer <token>` also works for API clients.

```bash
# sign in and keep the cookie
curl -c cookies.txt -H "Content-Type: application/json" \
  -d '{"identifier":"aarav@vidyagram.demo","password":"demo1234"}' \
  http://localhost:4000/api/v1/auth/login

# read the scoped snapshot
curl -b cookies.txt http://localhost:4000/api/v1/bootstrap
```

Full endpoint reference, error codes and access rules: [`docs/API.md`](docs/API.md).

---

## Roles, privacy and permissions

Permissions are enforced twice: at the route (`requireRole`) and per record
(`apps/api/src/lib/access.ts`).

- Students can open only their own attendance, marks, doubts and downloads.
- Teachers can open records for students in classes they teach or own.
- Parents can open records only for children with an **approved** guardian link.
- Administrators can open records for students in their own school.
- No role can open another student's private records outside those rules.
- A class code only joins a class; it never grants access to student records.
- Leaderboards show first names and activity points only, and can be disabled per class.

The public Privacy & Safety page explains this model and can be read before signing in.

---

## Multilingual coverage

| Language | Code | Interface coverage |
| --- | --- | --- |
| English | `en` | 100% |
| Hindi | `hi` | 100% |
| Marathi | `mr` | 78% |
| Bengali | `bn` | 74% |
| Tamil | `ta` | 70% |
| Telugu | `te` | 68% |

Missing interface strings fall back to English. Learning resources list the languages they are actually
available in; nothing is machine-translated silently.

---

## Offline and low-data behaviour

- Resources can be downloaded only when their metadata allows it, and show their size before download.
- A resource is readable offline only if it includes local content. Recording downloads are metadata-only in this demo.
- Quiz attempts, doubts and feedback submitted offline are queued in an outbox and synced when the browser reports connectivity.
- Live classes, cloud AI, email/SMS delivery and — in sample mode — server-side grading **do not work offline**, and the interface says so.
- The 5 MB storage limit is a demo guard rail. Production should use IndexedDB or the device file system with a real quota.

---

## Integrations

Runtime configuration is public and lives in `apps/web/public/config.js`. **Never put API keys or secrets there.**
Zoom, AI, email and SMS are disabled by default and are labelled as such throughout the app.

See [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md) for the expected server-side proxy contract and security rules.

---

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/AUDIT.md`](docs/AUDIT.md) | Findings from auditing the original frontend-only demo |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Workspace layout, request lifecycle, persistence, auth, data modes |
| [`docs/API.md`](docs/API.md) | Endpoint reference, error codes, curl examples |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Milestones, completed work and the remaining UI wiring |
| [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md) | Contracts for disabled third-party integrations |

---

## Honest limitations

- The API is an MVP: SQLite, single process, no password reset or e-mail verification yet.
- Server mode is partially wired: reads, auth, profile and quizzes use the API; other writes still update
  the local snapshot and the UI says so.
- Server data is not synced across devices while the app is in sample mode.
- Zoom, cloud AI, email and SMS require the server-side proxies described in [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md).
- Recording playback depends on media being supplied; unavailable recordings show an explicit unavailable state.
- Scholarship listings are **unverified samples**, not real opportunities.
- Sample accounts are intentionally displayed for review.

---

## Credits

Built by **Team AROHA**.
VidyaGram is an inclusive learning project for government schools.
