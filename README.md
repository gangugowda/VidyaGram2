# VidyaGram

**Learning for every village, every child.**
A responsive, multilingual learning platform for government schools (Classes 1–12), built by **Team AROHA**.

VidyaGram is a working demo application, not a marketing page. It provides role-based dashboards for students, teachers, parents/guardians and school administrators, with real in-browser persistence, privacy gates, offline queuing and honest labels for everything that needs external configuration.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run preview    # preview the production build
npm run typecheck  # TypeScript only
```

Requirements: Node 18+ (tested on Node 22) and a modern browser with Web Crypto and `localStorage`.

The production build uses `base: '/'` so assets resolve correctly on nested routes such as `/admin/approvals`. If you deploy the whole app under a subpath, update `base` in `vite.config.ts` and the absolute public-asset URLs in `index.html` together.

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

> All people, marks, attendance records, resources, scholarships and devices in this repository are **sample data**. Do not enter real personal information.

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

## Sample data and reset

The dataset is generated relative to today's date and stored in `localStorage` under `vidyagram.db.v4`. The session is stored under `vidyagram.session` and the language under `vidyagram.lang`.

To restore the original sample data at any time:

1. Sign in as the administrator and use **Reset demo** in the profile menu, or
2. Clear the site's `localStorage` and reload.

Resetting signs you out and rebuilds the sample school, classes, attendance, marks, resources, quizzes, labs, doubts, scholarships and feedback.

---

## Roles, privacy and permissions

The central gates live in `src/lib/access.ts` and the route guards in `src/App.tsx`.

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

Missing interface strings fall back to English. Learning resources list the languages they are actually available in; nothing is machine-translated silently.

---

## Offline and low-data behaviour

- Resources can be downloaded only when their metadata allows it, and show their size before download.
- A resource is readable offline only if it includes local content. Recording downloads are metadata-only in this demo.
- Quiz attempts, doubts and feedback submitted offline are queued in an outbox and synced when the browser reports connectivity.
- Live classes, cloud AI, email/SMS delivery and server-side grading **do not work offline**, and the interface says so.
- The 5 MB storage limit is a demo guard rail. Production should use IndexedDB or the device file system with a real quota.

---

## Integrations and configuration

Runtime configuration is public and lives in `public/config.js`. **Never put API keys or secrets there.** Zoom, AI, email and SMS are disabled by default and are labelled as such throughout the app.

See [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) for the expected server-side proxy contract and security rules.

---

## Project structure

```text
public/
  config.js                 Public runtime configuration (no secrets)
  manifest.webmanifest      Installable web app metadata
src/
  App.tsx                   Routes, guards and accessibility preferences
  main.tsx                  Providers and entry point
  components/               Layout, design system, icons, shared cards
  lib/
    types.ts                Domain model
    store.tsx               Auth, persistence, notifications, offline outbox
    access.ts               Privacy gates and derived statistics
    ai.ts                   Rule-based on-device demo assistant
    offline.ts              Download and quota helpers
    quiz.ts                 Auto-grading
    i18n/                   English, Hindi and partial regional dictionaries
    seed/                   Coherent sample dataset
  pages/
    auth/                   Sign in and three-step sign-up
    dashboard/              Role-specific dashboards
    admin/                  Administration screens
    ...                     Feature pages
docs/INTEGRATIONS.md        Backend contract for disabled integrations
```

---

## Honest limitations

- Authentication and data storage are browser-local for the demo. Passwords are salted and hashed with SHA-256 via Web Crypto, but this is **not** a production identity system.
- There is no server, so cross-device sync, real-time updates and server-side audit guarantees are not provided.
- Zoom, cloud AI, email and SMS require the proxies described in `docs/INTEGRATIONS.md`.
- Recording playback depends on media being supplied; unavailable recordings show an explicit unavailable state.
- Scholarship listings are **unverified samples**, not real opportunities.
- Sample accounts are intentionally displayed for review.

---

## Credits

Built by **Team AROHA**.
VidyaGram is an inclusive learning project for government schools.
