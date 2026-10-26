# PRD coverage — frontend

Every functional requirement in the LMS-AI PRD (v1.0), where it lives in the app, and a screenshot. Scope is the
**frontend**. Backend-only items (database, workers, LLM ingestion) are marked as such; the frontend already
calls their APIs, and the in-browser mock implements them so every screen works end to end.

**Status:** ✅ done · ◐ done with a note · ⛔ backend only

## 5.1 Student module

| ID | Requirement | Status | Where in the app | Screenshot |
| --- | --- | --- | --- | --- |
| FR-S1 | Register / login with email + password, JWT session | ✅ | Sign in, Create account; refresh-token flow in `services/apiClient.ts` | [04](images/04-sign-in.png), [05](images/05-create-account.png) |
| FR-S2 | Dashboard: enrolled courses, % progress, streak | ✅ | Student dashboard | [06](images/06-student-dashboard.png) |
| FR-S3 | Catalog: category, difficulty, rating filters + search | ✅ | Course Catalog (search box, filters, sort) | [01](images/01-catalog.png), [02](images/02-catalog-search.png) |
| FR-S4 | Video: resume from last position, playback speed | ✅ | Lecture player — "Resumed at …", speed menu (remembered) | [08](images/08-lecture-player-ask-ai.png) |
| FR-S5 | Timestamped notes and bookmarks | ✅ | Lecture player → Notes / Bookmarks tabs; click a time to jump | [10](images/10-lecture-notes.png), [11](images/11-lecture-bookmarks.png) |
| FR-S6 | Upload assignment (PDF / ZIP / code) before deadline | ✅ | Assignments — drag & drop, 25 MB limit, resubmit until graded | [18](images/18-assignments.png) |
| FR-S7 | Quizzes: MCQ, multi-select, short answer, auto-graded | ✅ | Quizzes → attempt → instant result with correct answers | [16](images/16-quiz-attempt.png), [17](images/17-quiz-result.png) |
| FR-S8 | Certificate PDF on completion | ◐ | Certificates — PDF download. Issued when **every lecture of a course** is complete (the PRD says "module"; week-2 milestone describes it per course) | [21](images/21-certificates.png) |
| FR-S9 | Badges on milestones | ✅ | Achievements — First Finish, 7-Day Streak, Perfect Score (PRD examples) + Early Bird, Curious Mind, Note Taker | [20](images/20-achievements.png) |
| FR-S10 | Recommendation widget from quiz performance | ✅ | Dashboard → "Recommended next" with the reason (weakest topic) | [06](images/06-student-dashboard.png) |

## 5.2 AI tutor module

| ID | Requirement | Status | Where in the app | Screenshot |
| --- | --- | --- | --- | --- |
| FR-A1 | Chat about the current course | ✅ | AI tutor page + "Ask AI" tab inside every lecture | [14](images/14-ai-tutor.png), [08](images/08-lecture-player-ask-ai.png) |
| FR-A2 | Answers grounded only in that course, with citations | ✅ | Every answer lists "From the course" sources; clicking one opens the lecture at that second. No match → says so and lists the course's topics | [08](images/08-lecture-player-ask-ai.png) |
| FR-A3 | Summarise a lecture into key points | ✅ | Lecture player → Summary tab | [09](images/09-lecture-summary.png) |
| FR-A4 | Personalised study plan from quiz history | ✅ | Study plan — 7-day plan, weakest topics first, tick off tasks | [19](images/19-study-plan.png) |
| FR-A5 | AI quiz (5–10 questions) from a transcript for instructor review | ✅ | Instructor → Quizzes → "Generate with AI" → draft | [32](images/32-quiz-manager.png), [33](images/33-ai-quiz-review.png) |
| FR-A6 | Explanation depth: Beginner / Intermediate / Advanced | ✅ | Switch at the top of every chat | [14](images/14-ai-tutor.png) |
| FR-A7 | Flashcards per module | ✅ | Lecture player → Flashcards tab (flip, "Got it" / "Again") | [12](images/12-lecture-flashcards.png) |
| FR-A8 | Per-topic mastery feeding difficulty for chat and quizzes | ✅ | Mastery bars (study plan, dashboard); a student's first chat in a course starts at a depth from their mastery; study plan and recommendations target weak topics | [19](images/19-study-plan.png) |
| — | RAG pipeline: chunking, embeddings, pgvector, LLM calls | ⛔ | AI Tutor service (backend). The mock uses a small keyword retriever over the real transcripts so the UI behaves the same | — |

## 5.3 Instructor module

| ID | Requirement | Status | Where in the app | Screenshot |
| --- | --- | --- | --- | --- |
| FR-I1 | Create a course: title, description, category, thumbnail, price | ✅ | My courses → New course (live catalog preview) | [29](images/29-new-course.png) |
| FR-I2 | Upload video / PDF / slides per lecture | ✅ | Course editor → Content → module → "+ Lecture" (video, slides, transcript) | [30](images/30-course-editor.png) |
| FR-I3 | Assignments with rubric and deadline | ✅ | Course editor → Assignments; grading by rubric with feedback | [34](images/34-grading.png) |
| FR-I4 | Build quizzes or approve AI-generated ones | ✅ | Quizzes → Blank quiz / Generate with AI → edit → "Approve & publish". The "AI-generated" label is shown to instructors only | [32](images/32-quiz-manager.png), [33](images/33-ai-quiz-review.png) |
| FR-I5 | Analytics: per-lecture drop-off, avg quiz score, time on task | ✅ | Analytics (charts with a table view), weakest topics | [35](images/35-analytics.png) |
| FR-I6 | Announcements to all enrolled students | ✅ | Announcements → students get a notification + dashboard card | [36](images/36-announcements.png) |

## 5.4 Admin module

| ID | Requirement | Status | Where in the app | Screenshot |
| --- | --- | --- | --- | --- |
| FR-AD1 | Approve / reject a course before it is listed | ✅ | Course approvals → Review → Approve and publish / Request changes (comment required) | [40](images/40-course-approvals.png), [41](images/41-course-approval.png) |
| FR-AD2 | View / suspend / delete users | ✅ | Users & roles → ⋯ menu (search, role and status filters, paging) | [38](images/38-user-actions-menu.png) |
| FR-AD3 | Platform metrics: DAU, enrolments, completion, revenue | ✅ | Platform overview (KPI tiles + charts with table view) | [37](images/37-admin-overview.png) |
| FR-AD4 | Assign / revoke roles | ✅ | Users & roles → Change roles. Sign-up always creates a student; this is how instructors are onboarded | [39](images/39-change-roles.png) |
| FR-AD5 | Moderate reported forum posts | ✅ | Moderation → Dismiss report / Remove post; instructors can also remove posts in their own course threads (§11) | [44](images/44-moderation.png) |

## Other in-scope items (PRD §3.1)

| Item | Status | Where |
| --- | --- | --- |
| Threaded discussion forum per course | ✅ | Course → Discussion → thread, nested replies, report | [22](images/22-discussion-forum.png), [23](images/23-discussion-thread.png) |
| Notifications (in-app + email) | ◐ | Bell with unread count, mark all read, links to the page. 14 events verified. **Email** sending is the Notification service's job (backend) — [24](images/24-notifications.png) |
| Leaderboard | ✅ | Achievements → per-course leaderboard (quiz score + progress) |
| Audit log | ✅ | Admin → Audit log (role changes, approvals, moderation, suspensions) | [45](images/45-audit-log.png) |
| Dark mode | ✅ | Theme button (light / dark / system) | [46](images/46-dark-dashboard.png) |
| i18n scaffolding | ✅ | Settings → Language: English, தமிழ், සිංහල, हिन्दी (navigation + common actions) | [25](images/25-settings.png), [26](images/26-language-hindi.png) |
| Responsive / mobile | ✅ | Every page works at 390 px with a slide-out menu | [47](images/47-mobile-dashboard.png), [48](images/48-mobile-ai-tutor.png) |
| Payments / subscriptions | ⛔ out of scope (§3.2) | Paid courses show the price; enrolment records a payment row in the mock |

## Non-functional requirements (PRD §6) — the frontend's part

| Category | What the frontend does |
| --- | --- |
| Performance | Pages are lazy-loaded; server data cached by TanStack Query (30 s stale time); debounced search; production build split into chunks |
| Security | JWT access + refresh with single-flight refresh, RBAC route guards, zod validation, safe redirects and links, no `innerHTML`, file type/size checks, security headers. Details: [README → Security](../README.md#security-prd-day-27-review) |
| Availability | Loading / empty / error state on every list; "Try again" on failures; offline message when the server can't be reached |
| Accessibility | WCAG 2.1 AA — axe reports 0 violations on all pages and dialogs in light and dark mode |

## Roles & permissions (PRD §11)

All rows of the matrix are enforced twice: the UI hides what a role can't use, and the mock API returns 403 for
direct calls (checked in the browser).

| Capability (PRD §11) | Student | Instructor | Admin | How |
| --- | --- | --- | --- | --- |
| Register / log in | ✅ | ✅ | ✅ | Sign in page; each role lands on its own home; wrong role sees a 403 page |
| Browse course catalog | ✅ | ✅ | ✅ | public catalog |
| Enrol, watch lectures, notes/bookmarks, assignments, quizzes | ✅ | — | — | learning pages are student-only |
| Use AI tutor chat | ✅ | ✅ as reviewer | — | instructors: course editor → **AI tutor** tab ([31](images/31-instructor-ai-tutor-review.png)) |
| Create / edit courses, upload material | — | ✅ own courses | ✅ any course | admins: sidebar → **All courses** ([42](images/42-admin-all-courses.png), [43](images/43-admin-edit-any-course.png)) |
| Create / approve AI-generated quizzes, grade | — | ✅ own courses | ✅ | Quizzes, Grading |
| Own-course analytics | — | ✅ | ✅ | Analytics |
| Platform analytics, approve courses, manage roles, suspend/delete | — | — | ✅ | Admin pages (an admin can't delete their own account) |
| Moderate forum | report only | ✅ own course threads | ✅ platform-wide | "Remove" in threads; Moderation page |
| Revenue / subscriptions | — | — | ⛔ out of scope (§3.2) | revenue chart on Platform overview |

## Additions beyond the PRD

Small UX additions, each documented so the mentor and backend team know about them:

| Addition | Why | Backend impact |
| --- | --- | --- |
| "New chat" + chat history in the AI tutor | Start a fresh topic without losing old answers | `POST /ai/chat/sessions` accepts `new: true` |
| Delete a chat (ChatGPT / Claude style) | Keep the chat list tidy | `DELETE /ai/chat/sessions/:id` |
| Starter questions built from the course's own lectures | Every suggested question is answerable (FR-A2) | none |
| "Ask the tutor" button on a quiz result | Fast help on missed topics (PRD §2.1 problem statement) | none |
| Three extra milestone badges | PRD lists badge examples, not a fixed set | none |
| Hindi language | Audience in India; same scaffolding as Tamil / Sinhala | none |

**Removed to stay within the PRD:** a student-generated "practice quiz" tab (not in the PRD; revision is covered by
FR-A7 flashcards), and student self-registration as an instructor (PRD: register = student, roles via admin).

## Roadmap check (PRD §12, frontend days)

| Day | Task | Status |
| --- | --- | --- |
| 5 | Frontend scaffold: routing, layout, auth pages, protected routes | ✅ |
| 6–7 | Student dashboard + catalog | ✅ |
| 8–14 | Player, progress, notes, bookmarks, assignments, quizzes, certificates, badges, streaks, instructor analytics | ✅ |
| 15–21 | AI tutor UI with citations, summaries, flashcards, AI quiz review, depth modes, mastery, study plan, recommendations | ✅ |
| 22–24 | Admin panel, approvals, metrics, moderation, forum, announcements, notifications | ✅ |
| 25 | Dark mode, accessibility pass, i18n scaffolding | ✅ |
| 26 | Containerise (Dockerfile + NGINX), CI pipeline (GitHub Actions) | ✅ CI runs on every pull request |
| 27 | Bug fixes, security review | ✅ |
| 28 | Seed demo data, README + documentation, deploy | ✅ — live on Vercel: https://lms-ai-platform-nine.vercel.app |
