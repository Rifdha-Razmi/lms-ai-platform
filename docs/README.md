# LMS-AI frontend — documentation

Frontend for **LMS-AI (Learning Management System with AI Tutor)** — Vertexon Learning Technologies, PRD v1.0.

| Document | What's in it |
| --- | --- |
| [PRD coverage](prd-coverage.md) | Every FR (S, A, I, AD), the §11 permissions matrix and the §12 roadmap — where each lives in the app, with screenshots |
| [Architecture](architecture.md) | How the app is built: layers, routing and roles, sign-in / token refresh, the AI tutor request flow, caching, build and deploy (diagrams) |
| [API contract](api-contract.md) | Every endpoint the frontend calls, who may call it, request/response notes and error format — for the backend team |
| [Root README](../README.md) | Quick start, demo accounts, tech stack, folder structure, security and accessibility review |

## Run it

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 — runs on the built-in mock API, no backend needed
```

Demo accounts (password `SecurePass123` for all): **ananya@example.com** (student), **rohit@example.com**
(instructor), **meera@example.com** (admin).

## Screenshots
All 48 screenshots were captured from the current build with the seeded demo data. Click any image for full size.


### Visitor

| | |
| --- | --- |
| **Catalog**<br>[![Catalog](images/01-catalog.png)](images/01-catalog.png) | **Catalog search**<br>[![Catalog search](images/02-catalog-search.png)](images/02-catalog-search.png) |
| **Course detail**<br>[![Course detail](images/03-course-detail.png)](images/03-course-detail.png) | **Sign in**<br>[![Sign in](images/04-sign-in.png)](images/04-sign-in.png) |
| **Create account**<br>[![Create account](images/05-create-account.png)](images/05-create-account.png) |   |

### Student

| | |
| --- | --- |
| **Student dashboard**<br>[![Student dashboard](images/06-student-dashboard.png)](images/06-student-dashboard.png) | **My learning**<br>[![My learning](images/07-my-learning.png)](images/07-my-learning.png) |
| **Lecture player — Ask AI**<br>[![Lecture player — Ask AI](images/08-lecture-player-ask-ai.png)](images/08-lecture-player-ask-ai.png) | **Lecture summary**<br>[![Lecture summary](images/09-lecture-summary.png)](images/09-lecture-summary.png) |
| **Lecture notes**<br>[![Lecture notes](images/10-lecture-notes.png)](images/10-lecture-notes.png) | **Lecture bookmarks**<br>[![Lecture bookmarks](images/11-lecture-bookmarks.png)](images/11-lecture-bookmarks.png) |
| **Lecture flashcards**<br>[![Lecture flashcards](images/12-lecture-flashcards.png)](images/12-lecture-flashcards.png) | **Lecture resources**<br>[![Lecture resources](images/13-lecture-resources.png)](images/13-lecture-resources.png) |
| **AI tutor (chat history, new chat)**<br>[![AI tutor (chat history, new chat)](images/14-ai-tutor.png)](images/14-ai-tutor.png) | **Quizzes**<br>[![Quizzes](images/15-quizzes.png)](images/15-quizzes.png) |
| **Quiz attempt**<br>[![Quiz attempt](images/16-quiz-attempt.png)](images/16-quiz-attempt.png) | **Quiz result**<br>[![Quiz result](images/17-quiz-result.png)](images/17-quiz-result.png) |
| **Assignments**<br>[![Assignments](images/18-assignments.png)](images/18-assignments.png) | **Study plan**<br>[![Study plan](images/19-study-plan.png)](images/19-study-plan.png) |
| **Achievements & leaderboard**<br>[![Achievements & leaderboard](images/20-achievements.png)](images/20-achievements.png) | **Certificates**<br>[![Certificates](images/21-certificates.png)](images/21-certificates.png) |
| **Discussion forum**<br>[![Discussion forum](images/22-discussion-forum.png)](images/22-discussion-forum.png) | **Discussion thread**<br>[![Discussion thread](images/23-discussion-thread.png)](images/23-discussion-thread.png) |
| **Notifications**<br>[![Notifications](images/24-notifications.png)](images/24-notifications.png) | **Settings**<br>[![Settings](images/25-settings.png)](images/25-settings.png) |
| **Language — हिन्दी**<br>[![Language — हिन्दी](images/26-language-hindi.png)](images/26-language-hindi.png) |   |

### Instructor

| | |
| --- | --- |
| **Instructor dashboard**<br>[![Instructor dashboard](images/27-instructor-dashboard.png)](images/27-instructor-dashboard.png) | **My courses**<br>[![My courses](images/28-instructor-my-courses.png)](images/28-instructor-my-courses.png) |
| **New course**<br>[![New course](images/29-new-course.png)](images/29-new-course.png) | **Course editor — content**<br>[![Course editor — content](images/30-course-editor.png)](images/30-course-editor.png) |
| **Course editor — AI tutor review**<br>[![Course editor — AI tutor review](images/31-instructor-ai-tutor-review.png)](images/31-instructor-ai-tutor-review.png) | **Quiz manager**<br>[![Quiz manager](images/32-quiz-manager.png)](images/32-quiz-manager.png) |
| **AI quiz review**<br>[![AI quiz review](images/33-ai-quiz-review.png)](images/33-ai-quiz-review.png) | **Grading by rubric**<br>[![Grading by rubric](images/34-grading.png)](images/34-grading.png) |
| **Analytics**<br>[![Analytics](images/35-analytics.png)](images/35-analytics.png) | **Announcements**<br>[![Announcements](images/36-announcements.png)](images/36-announcements.png) |

### Admin

| | |
| --- | --- |
| **Platform overview**<br>[![Platform overview](images/37-admin-overview.png)](images/37-admin-overview.png) | **User actions menu**<br>[![User actions menu](images/38-user-actions-menu.png)](images/38-user-actions-menu.png) |
| **Change roles**<br>[![Change roles](images/39-change-roles.png)](images/39-change-roles.png) | **Course approvals**<br>[![Course approvals](images/40-course-approvals.png)](images/40-course-approvals.png) |
| **Course approval review**<br>[![Course approval review](images/41-course-approval.png)](images/41-course-approval.png) | **All courses**<br>[![All courses](images/42-admin-all-courses.png)](images/42-admin-all-courses.png) |
| **Admin editing any course**<br>[![Admin editing any course](images/43-admin-edit-any-course.png)](images/43-admin-edit-any-course.png) | **Moderation**<br>[![Moderation](images/44-moderation.png)](images/44-moderation.png) |
| **Audit log**<br>[![Audit log](images/45-audit-log.png)](images/45-audit-log.png) |   |

### Dark mode & mobile

| | |
| --- | --- |
| **Dark mode — student dashboard**<br>[![Dark mode — student dashboard](images/46-dark-dashboard.png)](images/46-dark-dashboard.png) | **Mobile — dashboard**<br>[![Mobile — dashboard](images/47-mobile-dashboard.png)](images/47-mobile-dashboard.png) |
| **Mobile — AI tutor**<br>[![Mobile — AI tutor](images/48-mobile-ai-tutor.png)](images/48-mobile-ai-tutor.png) |   |
