# Integration contract

VidyaGram ships as a static frontend. Live meetings, cloud AI and email/SMS delivery need a small trusted backend. Until that backend exists, the app must clearly say the integration is not connected.

## Security rules

1. `public/config.js` is shipped to every browser. It may contain flags, labels and proxy URLs only. Never put API keys, OAuth secrets, SMTP credentials or AI provider keys in it.
2. Secrets belong in server-side environment variables or a managed secret store.
3. The browser calls your proxy over HTTPS. The proxy authenticates the VidyaGram user, checks role and class membership, then calls the provider.
4. Do not log student names, phone numbers, guardian contacts or free-text doubts in third-party analytics.
5. Return machine-readable errors. The UI must not show a success state unless the provider accepted the request.

Current public flags in `public/config.js`:

```js
window.VIDYAGRAM_CONFIG = {
  demoMode: true,
  version: '1.0.0',
  zoom: { configured: false, proxyUrl: '', label: 'Zoom' },
  ai: { configured: false, proxyUrl: '', provider: '' },
  email: { configured: false },
  sms: { configured: false },
}
```

`configured: false` is the honest default. The interface shows a configuration notice and offers a labelled demo fallback where one exists.

---

## 1. Live classes (Zoom)

The client never creates meetings. A server holds Zoom Server-to-Server OAuth credentials and creates meetings on behalf of the school.

### `POST {zoom.proxyUrl}/meetings`

Request (example):

```json
{
  "schoolId": "sch_ghs_rampur",
  "classId": "cls_8a",
  "sessionId": "ses_fractions",
  "topic": "Fractions: comparing and ordering",
  "startTime": "2026-11-16T10:00:00+05:30",
  "durationMinutes": 45,
  "teacherId": "usr_meera"
}
```

Response (example):

```json
{
  "ok": true,
  "meetingId": "81234567890",
  "joinUrl": "https://zoom.us/j/81234567890?pwd=...",
  "startUrl": "https://zoom.us/s/81234567890?zak=...",
  "passcode": "4821"
}
```

Rules:

- Return `startUrl` only to the owning teacher or an administrator.
- Return `joinUrl` only to enrolled students, their approved guardians, the class teacher and school administrators.
- Store `meetingId` with the session record so it can be updated or cancelled.
- Validate `startTime` and duration server-side.
- Handle provider failures with `{ "ok": false, "error": "..." }` and an appropriate HTTP status.

Optional webhooks can update attendance or session state later, but must be authenticated.

### Offline and demo behaviour

- Live classes cannot work offline. The app labels them as unavailable when offline.
- When Zoom is not configured, the app opens a clearly labelled **demo room** inside VidyaGram. It is not a real meeting and must never be presented as one.

---

## 2. AI assistant

The current assistant in `src/lib/ai.ts` is a deterministic, rule-based demo that runs entirely in the browser. It is useful for showing the interaction model but is not a language model. The UI states that no external AI provider is connected.

### `POST {ai.proxyUrl}/study-answer`

```json
{
  "question": "Why is 2/3 bigger than 3/5?",
  "language": "en",
  "gradeLevel": 8,
  "subjectId": "math"
}
```

```json
{
  "ok": true,
  "title": "Comparing fractions",
  "body": "A fraction shows part of a whole...",
  "steps": ["...", "..."],
  "followUp": "Can you order 1/2, 2/5 and 3/10?",
  "topic": "Fractions"
}
```

### `POST {ai.proxyUrl}/teacher-draft`

```json
{
  "kind": "lesson-plan",
  "prompt": "Class 8 fractions, 45 minutes, low-resource classroom",
  "language": "en",
  "gradeLevel": 8,
  "subjectId": "math"
}
```

```json
{
  "ok": true,
  "title": "Lesson plan: comparing fractions",
  "body": "..."
}
```

Rules:

- Authenticate and authorise the caller; limit requests per user and school.
- Strip or minimise personal data before sending prompts to a provider.
- Tell the user when an answer is AI-generated and remind teachers to review before publishing.
- Return `{ "ok": false, "error": "provider-unavailable" }` on failure; do not fabricate an answer.
- AI must not be advertised as available offline.

---

## 3. Email and SMS notifications

In-app notifications already work. Email and SMS need a gateway.

### `POST /api/integrations/notify`

```json
{
  "channel": "sms",
  "template": "attendance-low",
  "to": "+919876543210",
  "language": "hi",
  "params": {
    "studentName": "Aarav Sharma",
    "attendancePct": "68",
    "className": "Class 8 · Section A"
  },
  "dedupeKey": "attendance-low:usr_aarav:2026-11-15"
}
```

```json
{
  "ok": true,
  "messageId": "msg_123",
  "status": "queued"
}
```

Rules:

- Require consent and an approved guardian link before messaging a guardian.
- Respect quiet hours and notification preferences stored in the app.
- Use `dedupeKey` to avoid repeated low-attendance alerts.
- Never expose recipient lists to other users.
- Surface `queued`, `sent`, `delivered`, `failed` and `not-configured` states honestly.
- If no gateway is configured, keep the action in-app only and say so.

---

## 4. Static hosting

- Build with `npm run build` and serve `dist/`.
- Configure the host to fall back to `index.html` for client-side routes such as `/dashboard` and `/quizzes/:id`.
- Serve over HTTPS so Web Crypto and future service workers are available.
- `public/config.js` is copied to `dist/config.js`; edit per deployment without rebuilding, but never add secrets.
- Add security headers at the host: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a sensible `Permissions-Policy`.

---

## 5. What must stay honest

The following states are intentionally explicit in the UI and must not be replaced with optimistic success messages:

- Zoom not configured → demo room, clearly labelled.
- AI not configured → on-device rule-based demo, clearly labelled.
- Email/SMS not configured → in-app notification only.
- Recording without media → unavailable, not a fake player.
- Scholarship sample → unverified sample, not an official listing.
- Offline → no live classes, no cloud AI, no server grading until reconnect.
