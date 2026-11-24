# Roadmap

Status legend: **Done**, **In progress**, **Next**, **Later**.

The guiding rule stays the same as the demo: never claim a capability that is not
configured, and never hide where data actually lives.

---

## M0 — Audit and restructure · Done

- [x] Audit the frontend-only demo (`docs/AUDIT.md`).
- [x] Convert to an npm-workspaces monorepo: `apps/web`, `apps/api`, `packages/shared`.
- [x] Move the domain model, pure helpers and sample dataset into `packages/shared`.
- [x] Keep the existing UI, i18n, privacy gates and honesty labels intact.
- [x] Root scripts for `dev`, `build`, `typecheck`, `test`, `db:seed`, `db:reset`.

## M1 — Real persistence and authentication · Done

- [x] Fastify 5 + SQLite API with metadata-driven schema and migrations.
- [x] scrypt password hashing; credential columns never serialised.
- [x] Opaque, DB-backed session tokens in an `httpOnly` cookie; revocable sessions.
- [x] Role-based route guards and record-level access rules on the server.
- [x] Role-scoped `GET /bootstrap` snapshot with answer-key stripping.
- [x] Server-side quiz grading and marks publishing.
- [x] Guardian-link approval workflow.
- [x] Audit trail, notifications, rate limiting and a CSRF origin check.
- [x] 15 API integration tests; CI workflow.

## M2 — Wire the UI to the API · In progress

Done:

- [x] Browser API client and runtime config (`public/config.js` → `api`).
- [x] Sign-in, sign-up, sign-out and session restore through the API.
- [x] Boot from the API snapshot, with an honest fallback to the on-device demo.
- [x] Visible data-mode notice (server / sample-on-device / demo).
- [x] Profile updates via `PATCH /me`.
- [x] Server-graded quiz attempts and quiz result release.
- [x] Admin role removed from server-mode sign-up.

Next, in rough order of user impact:

- [ ] Attendance save (`PUT /classes/:id/attendance`) from the Attendance page.
- [ ] Assessment create, marks entry and publish from the Marks page.
- [ ] Quiz create and publish from the Quizzes page.
- [ ] Doubts: create, reply, resolve.
- [ ] Announcements and notification read state.
- [ ] Feedback create and admin triage.
- [ ] Parent link request and admin approval screens.
- [ ] Admin user management, audit view and overview counts.
- [ ] Class create, join and roster edits.
- [ ] Offline outbox replay against the API instead of the local seed.

Every one of these has an API endpoint already (see `docs/API.md`); the work is
UI-side: replace the local `mutate()` call with an API call plus a snapshot
refresh, and surface failures instead of assuming success.

## M3 — Pilot hardening · Next

- [ ] Password reset by e-mail and optional e-mail verification.
- [ ] Account lockout / progressive delays after repeated failures.
- [ ] Structured request logging with request ids in the UI error state.
- [ ] Backups and restore drill for the SQLite file (or move to Postgres).
- [ ] Data retention and deletion flow that matches the privacy page.
- [ ] Accessibility pass: axe checks in CI, keyboard-only walkthroughs.
- [ ] Component tests for the store's auth state machine.
- [ ] Load test the bootstrap endpoint with realistic class sizes.

## M4 — Multi-school deployment · Later

- [ ] Postgres + connection pooling; per-school tenancy checks in one place.
- [ ] Object storage for resources and recordings (signed URLs).
- [ ] Real-time updates (SSE or WebSocket) for notifications and live classes.
- [ ] Zoom / video integration behind a server-side proxy.
- [ ] AI assistant behind a server-side proxy with per-school quotas.
- [ ] SMS / e-mail delivery gateway with opt-out tracking.
- [ ] District-level reporting and CSV exports from the server.
- [ ] SSO for staff accounts (OIDC) and device management for shared tablets.

## Explicit non-goals for now

- A native mobile app. The PWA and low-data mode come first.
- Machine-translating content. Languages are listed only when a resource is
  actually available in them.
- Public leaderboards with marks. Only first names and activity points, and the
  feature can be disabled per class.
