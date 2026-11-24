# API reference

Base URL: `http://localhost:4000` in development, path prefix `/api/v1`.
Content type: `application/json`.

The API is implemented in `apps/api` with Fastify 5 and SQLite. Request bodies
are validated with Zod; invalid input never reaches the database.

---

## Response envelope

Success:

```json
{ "ok": true, "data": { } }
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "forbidden",
    "message": "This action is not available for your role.",
    "requestId": "0f0f4c1e-…"
  }
}
```

### Error codes

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 400 | `validation_error` | Body, query or params failed validation. `details` lists the fields. |
| 401 | `unauthorized` | No session cookie / bearer token. |
| 401 | `session_expired` | Token is unknown or expired. |
| 403 | `forbidden` | Signed in, but not allowed. |
| 403 | `csrf_origin` | Unsafe request with a non-allowlisted `Origin`. |
| 404 | `not_found` | Unknown record or endpoint. |
| 409 | `conflict` | State conflict (duplicate e-mail, already joined, last admin, …). |
| 409 | `class_code_invalid` | Sign-up class code is unknown for the school. |
| 429 | `rate_limited` | Too many requests. |

### Authentication

Sessions are opaque tokens stored hashed in SQLite. The browser receives them
in an `httpOnly`, `SameSite=Lax` cookie named `vg_session`. Non-browser clients
may send `Authorization: Bearer <token>` using the same token value.

Send `Origin` on unsafe requests, or omit it (server-to-server). A browser
request from an origin not listed in `WEB_ORIGIN` is rejected with
`403 csrf_origin`.

Rate limits: 300 requests/minute per IP globally; `POST /auth/login` is limited
to 10 per 5 minutes and `POST /auth/signup` to 8 per 10 minutes.

---

## Health

### `GET /health` and `GET /api/v1/health`

```json
{ "ok": true, "data": { "status": "ok", "database": "ok", "version": "0.2.0", "demoMode": true } }
```

---

## Auth

### `POST /api/v1/auth/signup`

Creates an account and signs the user in. Self sign-up must be enabled in
platform config.

```json
{
  "role": "student",
  "name": "Asha Kumari",
  "email": "asha@example.test",
  "phone": "9876543210",
  "password": "at-least-8-chars",
  "language": "hi",
  "schoolId": "sch_ghs_rampur",
  "gradeLevel": 8,
  "section": "A",
  "classCode": "VIDYA-8A-2026",
  "consentGiven": true
}
```

`role` is `student`, `teacher` or `parent`. Admin accounts are created by an
existing admin. Returns `201` with a `BootstrapPayload` and sets the session
cookie. `409 class_code_invalid` when the class code is unknown for the school.

### `POST /api/v1/auth/login`

```json
{ "identifier": "aarav@vidyagram.demo", "password": "demo1234" }
```

`identifier` may be an e-mail address or a phone number. Returns `200` with a
`BootstrapPayload`. A wrong password and an unknown account both return the same
`401 unauthorized` message.

### `POST /api/v1/auth/logout`

Deletes the session and clears the cookie.

```json
{ "ok": true, "data": { "signedOut": true } }
```

### `GET /api/v1/auth/me`

Returns the signed-in user and server info.

```json
{
  "ok": true,
  "data": {
    "user": { "id": "usr_aarav", "role": "student", "name": "Aarav Sharma", "...": "…" },
    "server": { "mode": "mvp", "version": "0.2.0", "demoMode": true }
  }
}
```

### `PATCH /api/v1/me`

Updates the caller's profile. At least one field is required.

```json
{ "name": "Aarav S. Sharma", "language": "mr", "lowDataMode": true }
```

Allowed: `name`, `phone`, `language`, `lowDataMode`, `reduceMotion`, `textSize`,
`avatarColor`. Returns `{ user, db }` where `db` is the refreshed scoped
snapshot.

---

## Bootstrap

### `GET /api/v1/bootstrap`

The single read endpoint the browser uses. Optional authentication.

- **Anonymous** → public schools, demo accounts without credentials, platform
  config. No classes, marks, attempts or notifications.
- **Signed in** → the role-scoped snapshot described in
  [ARCHITECTURE.md](ARCHITECTURE.md#6-the-bootstrap-read-model).

```json
{
  "ok": true,
  "data": {
    "db": { "version": 4, "schools": [], "users": [], "classes": [], "...": "…" },
    "user": null,
    "demoAccounts": [],
    "server": { "mode": "mvp", "version": "0.2.0", "demoMode": true }
  }
}
```

---

## Classes

| Method | Path | Role | Body / notes |
| --- | --- | --- | --- |
| `GET` | `/classes` | any signed-in | Classes visible to the caller. |
| `POST` | `/classes` | admin | `{ name, gradeLevel, section, teacherId, subjectIds?, code? }` → `201 { class }` |
| `PATCH` | `/classes/:id` | class teacher / admin | `{ leaderboardEnabled?, subjectIds?, code? }` → `{ class }` |
| `GET` | `/classes/:id/roster` | class viewer | `{ students: SafeUser[] }` |
| `POST` | `/classes/join` | student | `{ code }` → `201 { class }`. Idempotent for active enrolment. |

---

## Attendance

### `GET /api/v1/classes/:id/attendance?date=YYYY-MM-DD&limit=30`

Returns `{ days: AttendanceDay[] }`. Students receive only their own entries;
guardians receive only their approved children's entries.

### `PUT /api/v1/classes/:id/attendance`

Class teacher or admin only.

```json
{
  "date": "2026-11-20",
  "subjectId": "math",
  "period": "Full day",
  "entries": [
    { "studentId": "usr_aarav", "status": "absent", "note": "Family function" },
    { "studentId": "usr_priya", "status": "present" }
  ]
}
```

`status` is `present`, `absent`, `late` or `excused`. Saves are keyed by
class + date + period, so a second save updates the same day. Period labels are
normalised (`full-day`, `Full Day` and `fullday` are the same slot). Absences
notify approved guardians.

---

## Assessments and marks

| Method | Path | Role | Body |
| --- | --- | --- | --- |
| `GET` | `/classes/:id/assessments` | class viewer | — (students see published only) |
| `POST` | `/classes/:id/assessments` | class teacher / admin | `{ subjectId, title, type, date, maxMarks }` |
| `PUT` | `/assessments/:id/marks` | class teacher / admin | `{ marks: [{ studentId, marks, remarks? }] }` |
| `POST` | `/assessments/:id/publish` | class teacher / admin | — |

`type` is `unit-test`, `exam`, `assignment` or `project`. Grades are derived on
the server with the shared 91/81/71/… scale. Marks above `maxMarks` are
rejected. Publishing notifies students and approved guardians.

---

## Quizzes

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| `POST` | `/classes/:id/quizzes` | class teacher / admin | Create a quiz (draft). |
| `POST` | `/quizzes/:id/publish` | class teacher / admin | Makes it visible to students. |
| `GET` | `/quizzes/:id/attempts` | teacher / admin / owning student | Scoped attempt list. |
| `POST` | `/quizzes/:id/attempts` | student | Submit answers; graded server-side. |
| `POST` | `/quizzes/:id/release` | class teacher / admin | Release results when `showResults: "manual"`. |

Create payload:

```json
{
  "subjectId": "math",
  "title": "Fractions check",
  "instructions": "One attempt only.",
  "showResults": "manual",
  "showAnswers": true,
  "attemptsAllowed": 1,
  "timeLimitMin": 10,
  "language": "en",
  "questions": [
    { "id": "q1", "type": "mcq", "prompt": "1/2 + 1/2 = ?", "options": ["1", "2", "1/4"], "answer": "1", "explanation": "Two halves make one.", "points": 5 },
    { "id": "q2", "type": "fill", "prompt": "Write 0.5 as a fraction.", "answer": "1/2", "accept": ["2/4"], "points": 5 }
  ]
}
```

Attempt payload:

```json
{ "answers": { "q1": "1", "q2": "1/2" } }
```

Returns `201 { attempt }` with `score`, `maxScore` and `autoGraded`. Exceeding
`attemptsAllowed` returns `409 conflict`.

Answer keys and explanations are stripped from `/bootstrap` while results are
withheld. Grading never trusts the client.

---

## Doubts

| Method | Path | Role | Body |
| --- | --- | --- | --- |
| `POST` | `/doubts` | enrolled student | `{ classId, subjectId, topic, question, attachmentName? }` |
| `POST` | `/doubts/:id/replies` | class teacher / admin | `{ body, aiGenerated? }` |
| `PATCH` | `/doubts/:id/resolve` | owning student / class teacher / admin | — |

---

## Announcements

### `POST /api/v1/announcements`

Teacher or admin. `classId` is optional; without it the announcement goes to the
whole school.

```json
{ "classId": "cls_8a", "title": "Unit test on Friday", "body": "…", "audience": "all" }
```

`audience` is `students`, `parents` or `all`.

---

## Notifications

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/notifications?unread=true&limit=50` | Caller's notifications only. |
| `POST` | `/notifications/:id/read` | Caller's notification only. |
| `POST` | `/notifications/read-all` | Marks all read; returns `{ updated }`. |

---

## Feedback

| Method | Path | Role | Body |
| --- | --- | --- | --- |
| `POST` | `/feedback` | any signed-in | `{ category, subject, message }` |
| `GET` | `/feedback` | any signed-in | Own items; admins see their school. |
| `PATCH` | `/feedback/:id` | admin | `{ status?, adminReply? }` |

`category` is `learning-content`, `technical`, `suggestion` or `general`.

---

## Guardian links

| Method | Path | Role | Body |
| --- | --- | --- | --- |
| `GET` | `/parent-links` | any signed-in | Scoped link list. |
| `POST` | `/parent-links/request` | parent | `{ method: "code" \| "approval", inviteCode?, studentEmail?, note? }` |
| `POST` | `/parent-links/:id/approve` | admin | — |
| `POST` | `/parent-links/:id/reject` | admin | — |

`method: "code"` with a valid invitation code is approved immediately.
`method: "approval"` creates a `pending` link that an admin must approve before
the guardian can see any child records.

---

## Admin

All routes require `role: "admin"` and are limited to the admin's own school.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/admin/users?role=&q=&limit=200` | `{ users: SafeUser[] }` |
| `GET` | `/admin/users/:id` | `{ user }` |
| `PATCH` | `/admin/users/:id` | `{ role?, name?, phone?, disabled? }` |
| `GET` | `/admin/audit?limit=100` | `{ audit: AuditEntry[] }` |
| `GET` | `/admin/overview` | Counts for users, students, teachers, classes, quizzes, pending links. |
| `GET` | `/admin/classes` | `{ classes }` |
| `GET` | `/admin/whoami` | `{ user }` |

Safety rules: an admin cannot disable their own account or demote themselves,
and a school must keep at least one active administrator.

---

## Example session

```bash
# 1. Sign in and keep the cookie
curl -i -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"identifier":"aarav@vidyagram.demo","password":"demo1234"}' \
  http://localhost:4000/api/v1/auth/login

# 2. Read the scoped snapshot
curl -s -b cookies.txt http://localhost:4000/api/v1/bootstrap

# 3. Submit a quiz attempt (student)
curl -s -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"answers":{"q1":"1","q2":"1/2"}}' \
  http://localhost:4000/api/v1/quizzes/<quizId>/attempts

# 4. Sign out
curl -s -b cookies.txt -X POST http://localhost:4000/api/v1/auth/logout
```

---

## TypeScript types

Wire types live in `packages/shared/src/contracts.ts`
(`BootstrapPayload`, `SessionPayload`, `ApiResponse<T>`, `LoginInput`,
`SignupInput`, `AttendanceSaveInput`, `QuizAttemptInput`, …). The browser client
is `apps/web/src/lib/api.ts`.
