# API contract — what the frontend expects

The frontend talks to the backend only through `frontend/src/services/*Service.ts`. This document lists every
call it makes, who is allowed to make it, and where it came from in the PRD. The in-browser mock
(`frontend/src/mocks/handlers.ts`) implements every endpoint below with the same rules, so it is the
**runnable reference** for the backend team.

## Conventions (PRD §8)

| Item | Value |
| --- | --- |
| Base URL | `/api/v1` (set with `VITE_API_BASE_URL`) |
| Auth header | `Authorization: Bearer <access_token>` on every endpoint except auth and the public catalog |
| Access token | short-lived JWT (the mock uses 15 minutes) |
| Refresh | `POST /auth/refresh` with `{ refresh_token }`. On `401` the client refreshes **once** (single-flight) and retries; if refresh fails the user is signed out and sent to `/login?next=<page>` |
| Content type | JSON, except file uploads (`multipart/form-data`) and file downloads (`application/pdf`, blobs) |
| Field names | `snake_case`, matching the PRD §7 schema |
| Lists | paginated lists return `{ data, page, page_size, total }` |

### Error format (§8.8)

Every non-2xx response uses one envelope. The UI shows `message` to the user; when `field` is set, the message
appears under that form field.

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "email must be a valid email address", "field": "email" } }
```

| Status | `code` examples | What the UI does |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR`, `DEADLINE_PASSED` | field error or toast |
| 401 | `UNAUTHORIZED` | silent refresh, then Sign in |
| 403 | `FORBIDDEN`, `NOT_ENROLLED`, `ACCOUNT_SUSPENDED` | toast / "not available" state |
| 404 | `NOT_FOUND` | "This course isn't available" / 404 page |
| 409 | `ALREADY_ENROLLED`, `EMAIL_TAKEN`, `ALREADY_GRADED` | toast |
| 422 | `NOT_ENOUGH_CONTENT` | toast (e.g. AI quiz from a very short transcript) |
| 429 | `RATE_LIMITED` | "Too many requests. Wait a minute and try again." — the user's text is kept |

### Rate limits (§8.9)

| Group | Limit |
| --- | --- |
| `/auth/*` | 10 / minute / IP |
| `/ai/chat/*` | 20 / minute / user |
| everything else | 100 / minute / user |

## Endpoints

**Source:** `PRD` = listed in PRD §8 · `implied` = not listed, but needed by a PRD feature (e.g. reading
notifications, deleting a note) · **extension** = a UX addition beyond the PRD.

**Who can call it** is enforced on the server — the UI hides what a role can't use, but must never be the only check.

### Auth & profile (§8.1)

| Method | Endpoint | Source | Who can call it | Frontend client |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/register` | PRD | public | `authService` |
| `POST` | `/auth/login` | PRD | public | `authService` |
| `POST` | `/auth/refresh` | PRD | public | `apiClient (interceptor)` |
| `POST` | `/auth/logout` | PRD | public | `authService` |
| `GET` | `/auth/me` | PRD | signed-in (own data) | `authService` |
| `PUT` | `/users/me` | implied | signed-in (own data) | `authService` |

### Courses & content (§8.2)

| Method | Endpoint | Source | Who can call it | Frontend client |
| --- | --- | --- | --- | --- |
| `GET` | `/courses/categories` | implied | public | `courseService` |
| `GET` | `/courses` | PRD | public | `courseService` |
| `GET` | `/courses/:id` | PRD | public if approved; owner / admin otherwise | `courseService` |
| `POST` | `/courses` | PRD | admin / instructor | `courseService` |
| `PUT` | `/courses/:id` | PRD | course owner | `courseService` |
| `POST` | `/courses/:id/submit` | implied | course owner | `courseService` |
| `POST` | `/courses/:id/modules` | PRD | course owner | `courseService` |
| `POST` | `/modules/:id/lectures` | PRD | course owner | `courseService` |
| `POST` | `/courses/:id/approve` | PRD | admin | `adminService` |
| `GET` | `/instructor/courses` | implied | admin / instructor | `courseService` |

### Enrollment & learning (§8.3)

| Method | Endpoint | Source | Who can call it | Frontend client |
| --- | --- | --- | --- | --- |
| `POST` | `/courses/:id/enroll` | PRD | student, approved course, not yet enrolled | `learningService` |
| `GET` | `/enrollments/me` | PRD | signed-in (own data) | `learningService` |
| `GET` | `/lectures/:id/progress` | implied | signed-in (own data) | `learningService` |
| `POST` | `/lectures/:id/progress` | PRD | enrolled student (own progress) | `learningService` |
| `GET` | `/lectures/:id/resources/:file` | implied | enrolled or course owner | `learningService` |
| `GET` | `/lectures/:id/notes` | implied | signed-in (own data) | `learningService` |
| `POST` | `/lectures/:id/notes` | PRD | signed-in (own data) | `learningService` |
| `DELETE` | `/notes/:id` | implied | signed-in (own data) | `learningService` |
| `GET` | `/lectures/:id/bookmarks` | implied | signed-in (own data) | `learningService` |
| `POST` | `/lectures/:id/bookmarks` | PRD | enrolled or course owner | `learningService` |
| `DELETE` | `/bookmarks/:id` | implied | signed-in (own data) | `learningService` |

### Assignments & quizzes (§8.4)

| Method | Endpoint | Source | Who can call it | Frontend client |
| --- | --- | --- | --- | --- |
| `GET` | `/assignments/me` | implied | signed-in (own data) | `assessmentService` |
| `GET` | `/courses/:id/assignments` | implied | enrolled or course owner | `assessmentService` |
| `POST` | `/assignments` | PRD | course owner (instructor / admin) | `assessmentService` |
| `POST` | `/assignments/:id/submit` | PRD | enrolled student, before deadline | `assessmentService` |
| `GET` | `/assignments/:id/submissions` | implied | course owner | `assessmentService` |
| `PUT` | `/submissions/:id/grade` | PRD | course owner | `assessmentService` |
| `GET` | `/quizzes/me` | implied | signed-in (own data) | `assessmentService` |
| `GET` | `/courses/:id/quizzes` | implied | course owner; enrolled | `assessmentService` |
| `GET` | `/quizzes/:id` | implied | course owner; enrolled | `assessmentService` |
| `POST` | `/quizzes` | PRD | course owner (instructor / admin) | `assessmentService` |
| `PUT` | `/quizzes/:id` | implied | course owner | `assessmentService` |
| `POST` | `/quizzes/:id/publish` | implied | course owner | `assessmentService` |
| `POST` | `/quizzes/:id/attempt` | PRD | student | `assessmentService` |
| `POST` | `/attempts/:id/submit` | PRD | signed-in (own data) | `assessmentService` |

### AI tutor (§8.5)

| Method | Endpoint | Source | Who can call it | Frontend client |
| --- | --- | --- | --- | --- |
| `GET` | `/ai/chat/sessions` | implied | signed-in (own data) | `aiService` |
| `POST` | `/ai/chat/sessions` | PRD | enrolled student or course owner | `aiService` |
| `GET` | `/ai/chat/sessions/:id` | implied | signed-in (own data) | `aiService` |
| `DELETE` | `/ai/chat/sessions/:id` | **extension** | signed-in (own data) | `aiService` |
| `PUT` | `/ai/chat/sessions/:id/mode` | PRD | signed-in (own data) | `aiService` |
| `POST` | `/ai/chat/sessions/:id/messages` | PRD | signed-in (own data) | `aiService` |
| `POST` | `/ai/lectures/:id/summarize` | PRD | enrolled or course owner | `aiService` |
| `POST` | `/ai/lectures/:id/generate-quiz` | PRD | course owner (instructor / admin) | `aiService` |
| `POST` | `/ai/modules/:id/flashcards` | PRD | enrolled or course owner | `aiService` |
| `POST` | `/ai/study-plan` | PRD | signed-in (own data) | `aiService` |
| `GET` | `/ai/mastery/:courseId` | implied | signed-in (own data) | `aiService` |

### Recommendations & gamification (§8.6)

| Method | Endpoint | Source | Who can call it | Frontend client |
| --- | --- | --- | --- | --- |
| `GET` | `/recommendations/me` | PRD | signed-in (own data) | `gamificationService` |
| `GET` | `/users/me/badges` | PRD | signed-in (own data) | `gamificationService` |
| `GET` | `/users/me/streak` | PRD | signed-in (own data) | `gamificationService` |
| `GET` | `/leaderboard/:courseId` | PRD | enrolled or course owner | `gamificationService` |
| `GET` | `/certificates/me` | implied | signed-in (own data) | `gamificationService` |
| `GET` | `/certificates/:id/download` | implied | signed-in (own data) | `gamificationService` |

### Community & notifications

| Method | Endpoint | Source | Who can call it | Frontend client |
| --- | --- | --- | --- | --- |
| `GET` | `/courses/:id/threads` | implied | enrolled or course owner | `communityService` |
| `POST` | `/courses/:id/threads` | implied | course owner; enrolled | `communityService` |
| `GET` | `/threads/:id` | implied | enrolled or course owner | `communityService` |
| `POST` | `/threads/:id/posts` | implied | enrolled or course owner | `communityService` |
| `POST` | `/posts/:id/report` | implied | enrolled or course owner | `communityService` |
| `GET` | `/announcements` | implied | signed-in (own data) | `communityService` |
| `POST` | `/courses/:id/announcements` | implied | course owner | `communityService` |
| `GET` | `/notifications` | implied | signed-in (own data) | `communityService` |
| `PUT` | `/notifications/read-all` | implied | signed-in (own data) | `communityService` |
| `PUT` | `/notifications/:id/read` | implied | signed-in (own data) | `communityService` |

### Instructor analytics

| Method | Endpoint | Source | Who can call it | Frontend client |
| --- | --- | --- | --- | --- |
| `GET` | `/instructor/overview` | implied | admin / instructor | `instructorService` |
| `GET` | `/instructor/courses/:id/analytics` | implied | course owner | `instructorService` |

### Admin (§8.7)

| Method | Endpoint | Source | Who can call it | Frontend client |
| --- | --- | --- | --- | --- |
| `GET` | `/admin/users` | PRD | admin | `adminService` |
| `PUT` | `/admin/users/:id/role` | PRD | admin | `adminService` |
| `PUT` | `/admin/users/:id/suspend` | PRD | admin | `adminService` |
| `DELETE` | `/admin/users/:id` | implied | admin | `adminService` |
| `GET` | `/admin/courses/pending` | PRD | admin | `adminService` |
| `GET` | `/admin/courses` | implied | admin | `adminService` |
| `GET` | `/admin/analytics/overview` | PRD | admin | `adminService` |
| `GET` | `/admin/moderation/flagged-posts` | PRD | admin | `adminService` |
| `POST` | `/admin/moderation/posts/:id` | implied | admin, or instructor of that course | `adminService` |
| `GET` | `/admin/audit-logs` | implied | admin | `adminService` |

### Ops

| Method | Endpoint | Source | Who can call it | Frontend client |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | implied | public | `—` |
## Request / response notes

- **`POST /auth/register`** always creates a **student** (§8.1 "default role: student"). Instructors and admins get
  their role from `PUT /admin/users/:id/role` (FR-AD4).
- **`POST /ai/chat/sessions`** body `{ course_id, mode?, new? }`. Without `new` it returns the course's latest chat
  (creating one if none). `new: true` starts a fresh chat (**extension**: "New chat"). When `mode` is omitted on a
  student's first chat, the server picks it from topic mastery (FR-A8): average < 45 → `beginner`, ≥ 80 → `advanced`.
- **`POST /ai/chat/sessions/:id/messages`** body `{ message, lecture_id? }` → `{ reply, sources[], mode, message,
  user_message }`. `sources` are citations `{ lecture_id, lecture_title, timestamp_seconds, snippet }` (FR-A2). If
  nothing in the course matches, `sources` is empty and the reply says so instead of guessing.
- **`DELETE /ai/chat/sessions/:id`** (**extension**) deletes one of the caller's chats; messages cascade (§7 schema).
  Returns `204`.
- **`POST /assignments/:id/submit`** is `multipart/form-data` with `file` (PDF, ZIP or source code, ≤ 25 MB). A new
  submission replaces the previous one; once graded it returns `409 ALREADY_GRADED`.
- **`GET /quizzes/:id`** never sends `is_correct` / accepted answers to students (only to the course owner). The
  graded result, with correct answers, comes back from `POST /attempts/:id/submit`.
- **`POST /admin/moderation/posts/:id`** body `{ action: "dismiss" | "remove" }`.
- **`GET /certificates/:id/download`** and **`GET /lectures/:id/resources/:file`** return files (`application/pdf`).
- **`GET /health`** → `{ status: "ok" }` for uptime checks (§16.6).

## Switching from the mock to the real backend

1. In `frontend/.env` set `VITE_USE_MOCKS=false`.
2. Local dev: set `VITE_PROXY_TARGET` to the Core LMS service (Vite proxies `/api`). Production: set
   `VITE_API_BASE_URL` to the gateway URL, or keep `/api/v1` behind the same domain (see `nginx.conf`).
3. Nothing else changes — pages only use the service functions.
