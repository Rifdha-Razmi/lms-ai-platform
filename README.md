# LMS-AI — Learning Management System with AI Tutor

Vertexon Learning Technologies · PRD v1.0 · **Frontend**

A React + TypeScript single-page app with three workspaces — **Student**, **Instructor** and **Admin** — and an
AI tutor that answers only from a course's own lectures, with clickable source citations.

> This repository contains the **frontend** (`frontend/`). The Core LMS service (`backend/`) and AI service
> (`ai-service/`) from PRD §10 are built separately. Until they exist, the app runs against an in-browser
> mock API that implements the exact PRD §8 contract, so switching to the real backend is a single env change.

🌐 **Live demo:** https://lms-ai-platform-nine.vercel.app (mock mode, demo accounts below) ·
📦 **Repository:** https://github.com/Rifdha-Razmi/lms-ai-platform

📄 **Documentation:** [docs/](docs/README.md) — [PRD coverage](docs/prd-coverage.md) ·
[Architecture](docs/architecture.md) · [API contract](docs/api-contract.md) · [Screenshots](docs/README.md#screenshots)

## Quick start

```bash
cd frontend
cp .env.example .env      # VITE_USE_MOCKS=true by default
npm install
npm run dev               # http://localhost:5173
```

### Demo accounts (mock mode)

| Role       | Email                | Password        |
| ---------- | -------------------- | --------------- |
| Student    | ananya@example.com   | SecurePass123   |
| Instructor | rohit@example.com    | SecurePass123   |
| Admin      | meera@example.com    | SecurePass123   |

Mock data lives in the browser's localStorage. To start over from the seed, clear the site data
(DevTools → Application → Storage → **Clear site data**) and reload.

## Tech stack (PRD §13)

| Concern        | Choice                                        |
| -------------- | --------------------------------------------- |
| Framework      | React 18 + TypeScript + Vite                  |
| Routing        | React Router 6 (lazy-loaded pages, role guards) |
| Server state   | TanStack Query (caching, retries, invalidation) |
| Client state   | Zustand (auth session, theme, language)       |
| HTTP           | Axios with JWT access + silent refresh-token flow |
| Styling        | Tailwind CSS with design tokens, dark mode    |
| Forms          | react-hook-form + zod                         |
| Charts         | Recharts (with table view for accessibility)  |
| i18n           | i18next — English, Tamil, Sinhala, Hindi scaffolding |
| Mock API       | MSW (Mock Service Worker) + seeded data       |
| Tests          | Vitest + Testing Library                      |

## Folder structure (PRD §10)

```
frontend/src
├── components/
│   ├── common/        # UI kit, CourseCard, charts, FileDrop, NotificationBell
│   ├── student/       # VideoPlayer, LecturePanels, StreakStrip
│   ├── instructor/    # CourseStatusPill
│   ├── admin/
│   └── ai-tutor/      # ChatPanel, Flashcards, MasteryBars
├── pages/
│   ├── auth/          # Login, Register
│   ├── dashboard/     # Student dashboard
│   ├── course-catalog/# Catalog, Course detail
│   ├── course-player/ # Video player + notes/bookmarks/AI tabs
│   ├── quizzes/       # Quiz list, attempt + auto-graded result
│   ├── student/       # My learning, Assignments, Tutor, Study plan, Achievements, Certificates, Forum
│   ├── instructor/    # Dashboard, Course editor, Grading, Quiz manager/editor, Analytics, Announcements
│   ├── admin-panel/   # Overview, Users & roles, Approvals, Moderation, Audit log
│   └── common/        # Settings, 403/404
├── services/          # Typed API clients per domain (axios) + query keys
├── store/             # Zustand slices (auth, ui)
├── hooks/  layouts/  routes/  utils/  styles/  i18n/  types/
└── mocks/             # MSW handlers, seed DB, mock RAG engine (dev/demo only)
```

## Connecting the real backend

1. Set `VITE_USE_MOCKS=false` in `.env`.
2. Point `VITE_PROXY_TARGET` at the Core LMS service for local dev (Vite proxies `/api`), or set
   `VITE_API_BASE_URL` to the gateway URL in production.
3. Every call lives in `src/services/*Service.ts` and follows PRD §8 (base `/api/v1`, `Authorization: Bearer`,
   error envelope `{ error: { code, message, field } }`). Endpoints the PRD implies but doesn't list
   (e.g. `GET /quizzes/:id`, `GET /notifications`, `GET /certificates/me`) are documented in
   `src/mocks/handlers.ts` — the mock is the contract reference for the backend team.
4. **Additions beyond PRD §8.5 (need a backend endpoint):**
   - `DELETE /ai/chat/sessions/:id` — student deletes one of their tutor chats (messages cascade, per §7).
   - `POST /ai/chat/sessions` accepts `new: true` to start a fresh chat instead of reopening the latest one
     ("New chat"). Without it, the course's most recent chat is returned.

## PRD coverage

All 29 functional requirements (FR-S1–S10, FR-A1–A8, FR-I1–I6, FR-AD1–AD5), the §11 permissions matrix and the
frontend days of the §12 roadmap are covered. The full table — with where each one lives and a screenshot — is in
**[docs/prd-coverage.md](docs/prd-coverage.md)**.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with mock API |
| `npm run build` | Type-check and production build |
| `npm run lint` / `npm run typecheck` / `npm test` | Quality gates (also run in CI) |

## Deployment

- **Vercel**: import the repo, set root directory to `frontend`. `vercel.json` handles SPA routing.
  Keep `VITE_USE_MOCKS=true` for a demo deploy, or set it to `false` with `VITE_API_BASE_URL` for production.
- **Docker** (PRD §14): `docker build -t lms-ai-frontend frontend` — nginx serves the build and proxies `/api`
  to the `backend` service.
- **CI**: `.github/workflows/frontend-ci.yml` runs lint, type-check, tests and build on every PR.

## Security (PRD Day 27 review)

Checked in the browser against the mock API (the mock enforces the same rules the backend must):

- **Auth:** JWT access + refresh tokens (PRD §8.1). An expired access token is refreshed once
  (single-flight); if the refresh fails the user is signed out and sent to Sign in with `?next=`.
  Sign-out clears tokens and the query cache.
- **Redirects:** `?next=` only accepts in-app paths (`src/utils/safeUrl.ts`) — no open redirects.
- **XSS:** no `dangerouslySetInnerHTML`/`innerHTML`; all user content renders as text. Links built from
  API data (submission files, lecture resources) only allow `http(s):`, `blob:` and in-app paths.
- **RBAC (PRD §11):** routes are guarded in the UI, and every protected endpoint must also check
  role/ownership on the server — the mock returns 403 for students calling admin/instructor APIs and
  for instructors editing another instructor's course.
- **Input:** zod validation on forms, length limits on text, file type + 25 MB size checks before upload.
- **Rate limits (PRD §8.9):** a 429 shows "Too many requests…" and keeps the user's text.
- **Login errors** are identical for unknown email and wrong password (no account enumeration).
- **Headers:** `nginx.conf` and `vercel.json` send `X-Frame-Options: DENY`,
  `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy` and `Permissions-Policy`.
- **Dependencies:** `npm audit --omit=dev` — no high/critical issues. Two moderate React Router
  advisories need a v7 upgrade; they concern backslash-prefixed redirects (blocked by `safeNextPath`)
  and SSR hydration (not used — this is a client-side SPA).
- **Recommendation for the backend:** tokens are kept in `localStorage` today. For production, issue
  the refresh token as an `httpOnly; Secure; SameSite=Strict` cookie so script can never read it.

## Accessibility (PRD Day 25 pass)

- axe-core (WCAG 2.1 A/AA) on every page for all roles, in light and dark mode, including open dialogs,
  menus and the mobile nav drawer: **0 violations**.
- Keyboard: "Skip to content" link, visible focus rings, dialogs trap focus and close on `Esc`, focus
  returns to the button that opened them, Enter submits forms.
- Text colours meet 4.5:1 contrast; charts have a table view; video has keyboard controls.

## Notes

- Demo lecture videos stream from public sample URLs, so they need an internet connection.
- Files uploaded in mock mode live only for the browser session (they're held as blob URLs).
