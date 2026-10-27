# ScholarsCrib — Frontend QA Feature PRD

| | |
|---|---|
| **Audience** | QA engineer testing the frontend end to end |
| **Product** | ScholarsCrib (Nigerian senior secondary: SS1–SS3 and post-SS3 resitters) |
| **Scope** | `scholarscrib-frontend` (Next.js 16, React 19) against the FastAPI backend |
| **Document version** | v1.0 |
| **Date** | 2026-10-26 |
| **Build under test** | Frontend `main`, product version 0.1.0, launch candidate for November 2026 |
| **Companion** | `PRD.md` v0.4 (product case and roadmap). This document is the testable view of it |

> **How to use this document.** Section 1 tells you what is in and out of scope.
> Section 2 sets up the environment, accounts and data you need. Section 3 is the
> feature-by-feature specification: requirements (R), test cases (T) and edge
> cases (E) with IDs you can lift straight into a test-management tool. Section 4
> covers cross-cutting checks (responsive, accessibility, performance, security).
> Sections 5–7 give the regression pack, exit criteria and known issues.
>
> **Where this document is not certain**, it says **VERIFY**. Those items were
> derived from reading the code, not from running the app. Confirm them against
> the running build and record the true value; do not assume the document is
> right.

---

## 1. Scope

### 1.1 In scope (launch scope)

| Area | Surface |
|---|---|
| Public site | Landing, About, Contact, Terms, `/learn`, `/past-questions`, offline page |
| Authentication | Register, login, Google sign-in, forgot/reset password, sign-out, session expiry |
| Onboarding | Complete-profile step |
| Dashboard | Today's Session, summary tiles, announcements |
| Classroom | Subject → class/term → topic → notes, topic study, topic quiz, topic practice |
| Practice | Past questions, JAMB CBT practice, full JAMB CBT simulation, mock exams, results and history |
| Flashcards | Deck list, build from lesson, study session, stats |
| Study plan | Plan setup, term/blended/exam modes, class and term scope, timetable editor, plan view, delete |
| Performance | Overview, subject breakdown, topic standing |
| Achievements | Badges, progress, unlock toasts |
| Library | Resources, in-app PDF reader, signed files |
| Astra | Student AI tutor panel (beta) |
| Notifications | Bell, notifications page, push opt-in, preferences, announcements |
| Settings | Profile, academic details, avatar, password, notifications, subscription and billing |
| Billing | Plan picker, upgrade prompts, checkout redirect (Paystack **test** mode) |
| Admin console | Admin auth, overview, questions, lessons, curriculum, terms, library, announcements, students, team, audit, Astra |
| PWA | Manifest, install, offline page |

### 1.2 Out of scope for this cycle

- Backend unit and API testing, except where an FE test must observe a backend response (section 2.5).
- Load and penetration testing (a light security pass is in 4.5).
- Teacher portal, school portal, marketplace, video lessons, parent portal. None exist yet. The teacher role is rejected at registration by design.
- Real-money Paystack payments. Test mode only until pricing is final and live keys are issued.
- Offline mode beyond the PWA shell and `/offline` page.
- The planned gamification enhancement (XP, levels) and the repair stage (hints, misconception feedback). Not built. Do not log missing-feature bugs against them.

### 1.3 Product principles QA should hold the UI to

1. **Honest signal.** The UI must say "not enough data yet" rather than show a precise-looking number from thin evidence (performance, mastery, predicted grades, Today's Session).
2. **Exam accuracy.** Grading scales, timings, question counts and marks must match the real papers (section 3.7).
3. **Fail closed.** If the tier cannot be determined, treat the user as FREEMIUM. A paid feature must never leak to a lower tier.
4. **Learning over points.** Nothing should reward meaningless activity or shame the student (streak-loss copy, locked states).
5. **Two isolated realms.** A student session must never reach `/admin`, and an admin session is not a student session.

---

## 2. Test environment, accounts and data

### 2.1 Environments

| Item | Value |
|---|---|
| Frontend | Next.js app, `npm run build && npm start` for release testing; `npm run dev` is acceptable for exploratory work only |
| Backend | FastAPI at `API_URL` / `NEXT_PUBLIC_API_URL` (local default `http://localhost:8000`) |
| Env flags | `NEXT_PUBLIC_BILLING_ENABLED`, `NEXT_PUBLIC_PUSH_ENABLED`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME` |
| Payments | Paystack **test** keys and test cards only |
| Timezone | App calendars (streaks, study-plan days, reminders) use `Africa/Lagos`. Test at least once with the device set to a different timezone |

Run every feature in both flag states where a flag applies: billing on/off, push on/off.

### 2.2 Browser and device matrix

| Priority | Targets |
|---|---|
| P0 | Chrome (latest) on Android, Chrome (latest) on Windows, Safari on iOS |
| P1 | Firefox, Edge, Samsung Internet, Safari on macOS |
| Viewports | 360×640, 390×844, 768×1024, 1280×800, 1920×1080 |
| Network | Fast, Slow 3G, and offline (throttle in devtools). The target market is data-constrained |

### 2.3 Test accounts

Create and keep these. Each tier needs a real subscription or an admin comp, not a UI hack.

| ID | Role / tier | Class / track | Purpose |
|---|---|---|---|
| ACC-F1 | Student, FREEMIUM | SS1, Arts | Free-tier behaviour, lower-class scope |
| ACC-F2 | Student, FREEMIUM | SS3, Science | Exam-year behaviour, exam-mode plan |
| ACC-S1 | Student, STANDARD (comp) | SS2, Commercial | Tier gates at STANDARD |
| ACC-P1 | Student, PREMIUM (comp) | SS3, Science | Premium library and unrestricted features |
| ACC-R1 | Student, FREEMIUM | Resitter (if the profile allows it — VERIFY) | Post-SS3 path |
| ACC-N1 | Brand-new student, no profile data | none | Onboarding and empty states |
| ACC-G1 | Student created via Google sign-in | none | OAuth path and complete-profile |
| ACC-X1 | Student, suspended | any | Suspension and session revocation |
| ADM-O | Admin, owner | n/a | Owner-only actions |
| ADM-A | Admin, non-owner | n/a | Confirms owner-only actions are blocked |

### 2.4 Test data to prepare

- At least one subject with **complete** notes and questions across years, one with **partial** notes, and one with **no** notes. Lesson coverage is the launch risk; empty and partial states must be tested on purpose.
- A subject-year combination with a full JAMB paper for four subjects (needed for the CBT simulation), and one combination where no four subjects share a year (to test the picker's empty state).
- At least one topic with notes, a quiz and flashcard-eligible lesson content.
- Subjects for each track (Science, Arts, Commercial) plus Core and Vocational.
- A configured academic term calendar (admin → terms) that covers today, and a second environment state where **no term covers the next 30 days** (study-plan fallback behaviour).
- An active announcement, an expired one, and a cancelled one.
- A library with free and premium resources, including a PDF.

### 2.5 Observing the backend from the FE

Use the browser network tab. The FE is a pure client; every gated call crosses to the backend with a Bearer token. Useful endpoint families: `/api/auth/*`, `/api/assessments/*`, `/api/classroom/*`, `/api/flashcards/*`, `/api/study-plan/*`, `/api/performance/*`, `/api/library`, `/api/notifications/*`, `/api/push/subscription`, `/api/tutor/*` (SSE streams), `/api/billing/checkout`, `/api/user/*`, and the `/admin/api/*` family. For each failure case, record the status code, the response body and what the UI showed.

### 2.6 Entry criteria for a test cycle

Build deploys and `npm run build` succeeds; backend health is green; migrations at head; seed data present; test accounts created; Paystack test keys configured; cron secret configured (an unset secret makes cron endpoints return 204 silently, which will make reminder tests look broken).

---

## 3. Feature specification

Notation: **R** = requirement, **T** = test case, **E** = edge case. Priority **P0** blocks launch, **P1** should be fixed before launch, **P2** can ship with a known issue.

### 3.1 Public site and SEO

**Routes:** `/`, `/about`, `/contact`, `/terms`, `/learn`, `/learn/[subject]`, `/learn/[subject]/[topic]`, `/past-questions`, `/past-questions/[exam]`, `/past-questions/[exam]/[subject]`, `/past-questions/[exam]/[subject]/[year]`, `/offline`, `robots.txt`, `sitemap`.

| ID | Pri | Requirement / test |
|---|---|---|
| R-PUB-1 | P0 | Logged-out visitors can open all public routes without being redirected to login |
| R-PUB-2 | P0 | A logged-in student visiting `/` is redirected to `/dashboard` |
| R-PUB-3 | P0 | Every gated route redirects a logged-out visitor to `/login?callbackUrl=<original path+query>` and, after login, returns to it |
| R-PUB-4 | P1 | Landing page pricing matches what the app actually grants per tier (see 3.15 matrix). Flag any claim the app does not honour |
| R-PUB-5 | P1 | Public topic and past-paper pages carry canonical, Open Graph and Twitter tags and JSON-LD; every gated route is `noindex` |
| R-PUB-6 | P1 | `robots.txt` and sitemap shards resolve and list only public URLs (about 137 at SEO hand-off; record the current count) |
| R-PUB-7 | P1 | Public copy states that ScholarsCrib is a practice tool and **not affiliated** with WAEC, JAMB or NECO |
| T-PUB-1 | P0 | Open each public route, logged out, on mobile and desktop: renders, no console errors, no broken images, navigation works |
| T-PUB-2 | P0 | Visit `/dashboard`, `/practice`, `/study-plan`, `/settings` logged out: redirected to login with `callbackUrl`; complete login and land on the original page |
| T-PUB-3 | P1 | Open a `/learn/...` topic with and without notes; the empty state is graceful, not a blank page |
| T-PUB-4 | P1 | Open a non-existent slug under each dynamic public route: a proper 404 page, not a crash |
| T-PUB-5 | P1 | Landing page CTAs: "Get started" → register; "Sign in" → login |
| T-PUB-6 | P2 | Contact page: details displayed correctly (static copy; there is no form backend — VERIFY whether a form exists) |
| E-PUB-1 | P1 | Offline: load `/offline` directly; open the installed PWA with no network and confirm the offline page appears rather than the browser dinosaur |

### 3.2 Authentication

**Routes:** `/register`, `/login`, `/forgot-password`, `/reset-password`, Google callback, `/signed-out`.

**Registration (two steps).** Step 1: first name, last name, email, password (min **6** characters, show/hide toggle). Step 2: class level (SS1/SS2/SS3), track (Science/Arts/Commercial), state (36 states + FCT). On success redirect to `/login?registered=true`.

| ID | Pri | Requirement / test |
|---|---|---|
| R-AUTH-1 | P0 | Step 1 blocks Next with a clear message when names are empty, email is empty, or password is under 6 characters |
| R-AUTH-2 | P0 | Step 2 blocks Submit when class level, track or state is unselected |
| R-AUTH-3 | P0 | The submit button cannot be double-pressed; it stays disabled through the redirect |
| R-AUTH-4 | P0 | Duplicate email shows the backend's error message in the form banner |
| R-AUTH-5 | P0 | A network failure shows a connection error, not a stack trace or a frozen spinner |
| R-AUTH-6 | P0 | The teacher role is not selectable or is rejected ("coming soon"); no teacher account can be created |
| R-AUTH-7 | P0 | Login with correct credentials lands on `/dashboard` (or `callbackUrl`); wrong credentials show an error without revealing whether the email exists (VERIFY exact copy) |
| R-AUTH-8 | P0 | Sign-out clears the session and lands on `/signed-out` or login; the Back button does not reveal gated pages |
| R-AUTH-9 | P0 | Google sign-in completes via the backend code exchange; a first-time Google user is routed to complete-profile |
| R-AUTH-10 | P0 | Forgot-password accepts an email and always shows a neutral confirmation; reset-password enforces the minimum length and rejects an expired or reused token with a clear message |
| R-AUTH-11 | P0 | A suspended account cannot log in and an active session is revoked on its next token refresh (live revocation) |
| R-AUTH-12 | P0 | A student token never grants access to `/admin/*`; an admin token never acts as a student |
| T-AUTH-1 | P0 | Happy path register → login → dashboard on ACC-N1 |
| T-AUTH-2 | P0 | Register with each validation failure above; confirm the message and that no request is sent where the check is client-side |
| T-AUTH-3 | P0 | Register with an email in mixed case, with leading/trailing spaces, and with `+tag` addressing |
| T-AUTH-4 | P0 | Login → open two tabs → sign out in one → act in the other: second tab is bounced to login, not left in a half-working state |
| T-AUTH-5 | P0 | Delete the auth cookie manually while on a page; next navigation redirects to login. Replace it with a garbage value: same, with no redirect loop |
| T-AUTH-6 | P0 | Google flow: cancel at the consent screen; deny scopes; return with a tampered `state`. The app must recover to the login page with an error, not hang |
| T-AUTH-7 | P0 | Full forgot → email link → reset → login with the new password; confirm the old password no longer works |
| T-AUTH-8 | P1 | Reset-password link opened twice; opened after expiry |
| T-AUTH-9 | P0 | Suspend ACC-X1 from the admin console while signed in on the student app; the next request signs the student out |
| T-AUTH-10 | P1 | Device limit: on STANDARD and above, a third browser sign-in is rejected or the oldest device is revoked (VERIFY which). FREEMIUM has no limit. Confirm the message and that revoking a device removes its push subscription |
| E-AUTH-1 | P1 | `callbackUrl` pointing to an external origin must be ignored (open-redirect check) |
| E-AUTH-2 | P1 | Password manager autofill, paste into password, and long (200+ char) inputs |
| E-AUTH-3 | P2 | Session expiry mid-exam (see E-PRAC-6) |

### 3.3 Onboarding and complete-profile

**Route:** `/complete-profile` (used for Google users and anyone missing academic data).

| ID | Pri | Requirement / test |
|---|---|---|
| R-ONB-1 | P0 | A user without class level, track or state cannot reach the dashboard until they complete the profile |
| R-ONB-2 | P0 | After completion, subject defaults, classroom scope and library follow the chosen class and track |
| T-ONB-1 | P0 | ACC-G1 signs in with Google, completes the form, lands on the dashboard with the right scope |
| T-ONB-2 | P1 | Attempt to open `/dashboard` directly while the profile is incomplete: redirected back |
| T-ONB-3 | P1 | Refresh mid-form; browser Back; submit with a missing field |

### 3.4 Dashboard and Today's Session

**Route:** `/dashboard`.

**Today's Session:** one stable, time-boxed queue of 3–4 actions, each with minutes, a direct link and an evidence-based reason. Order: retrieval of fading material first, then focused practice on a weak topic, then new material. Progress reads "N of M done". The queue is **stable for the day** (does not reshuffle on reload). Completion is recorded per item.

| ID | Pri | Requirement / test |
|---|---|---|
| R-DASH-1 | P0 | The session shows 3–4 items, each with minutes, a working deep link and a reason a student can check |
| R-DASH-2 | P0 | Items follow the retrieval → practice → new-material order |
| R-DASH-3 | P0 | Reloading the page does not reorder the queue; completing an item ticks it and updates "N of M" without reshuffling |
| R-DASH-4 | P1 | Completing a lesson, a practice set or a flashcard review outside the session ticks the matching item |
| R-DASH-5 | P0 | A new student with no evidence sees an honest empty or low-data state, not fabricated precision or reasons |
| R-DASH-6 | P1 | Streak and day boundaries use Lagos time; the session rolls over at Lagos midnight |
| R-DASH-7 | P1 | Announcements appear, can be dismissed, stay dismissed, and expired or cancelled ones never show |
| T-DASH-1 | P0 | ACC-N1 first load: empty-state copy, a clear next action, no errors |
| T-DASH-2 | P0 | ACC-F2 after some practice and flashcard reviews: the session reflects real fading and weak topics |
| T-DASH-3 | P0 | Tap every link in the session; each lands on the right topic or mode |
| T-DASH-4 | P1 | Complete all items; confirm the finished state and that the encouragement copy is non-shaming |
| T-DASH-5 | P1 | Switch the device timezone across the Lagos midnight boundary; the session and streak behave by Lagos time |
| T-DASH-6 | P1 | Change class or track in settings; the session reflects the new scope (see 3.14) |
| E-DASH-1 | P1 | Plan replanned during the day: items follow the replanned plan so lessons still tick as done |
| E-DASH-2 | P2 | Backend slow or failing: skeletons, then an error state with retry; never an infinite spinner |

### 3.5 Classroom (subjects, topics, notes)

**Routes:** `/classroom`, `/classroom/[subject]`, `/classroom/[subject]/[topic]`, `.../study`, `.../quiz`, `.../practice`, `.../practice/result`.

**Flow:** choose a subject → pick class (SS1/SS2/SS3) and term → pick a topic → land on the notes. Notes carry markdown with LaTeX, key points, worked examples and attached resources. **Lesson-note coverage is the launch priority; this is the most important section to test with partial data.**

| ID | Pri | Requirement / test |
|---|---|---|
| R-CLS-1 | P0 | Subjects shown match the student's track plus Core; Vocational shown per curriculum rules (VERIFY) |
| R-CLS-2 | P0 | The class tab and term filter follow the curriculum; switching the subject or class resets the class tab |
| R-CLS-3 | P0 | Topics list in curriculum order with study-time estimates; the prerequisite and standing indicators are accurate |
| R-CLS-4 | P0 | A topic with notes opens the study view; a topic **without** notes shows a clear "coming soon" or empty state, never a blank page or a 500 |
| R-CLS-5 | P0 | LaTeX renders (KaTeX) for inline and block maths, including fractions, roots, subscripts, Greek letters and chemical formulae; no raw `$...$` leaks |
| R-CLS-6 | P1 | Lesson progress is recorded as the student reads; "completed" ticks only when the completion rule is met (VERIFY the rule) |
| R-CLS-7 | P1 | Topic quiz and topic practice write to the learning ledger and update the topic standing |
| R-CLS-8 | P1 | Pre-test lets a student skip what they already know and is reflected in the learning path |
| R-CLS-9 | P1 | Images, tables and long notes render responsively without horizontal page scroll |
| R-CLS-10 | P1 | "Ask Astra" entry point is present on the lesson and passes the page context (see 3.12) |
| T-CLS-1 | P0 | Walk every subject on ACC-F1, ACC-F2 and ACC-S1; count subjects, topics and notes shown and compare with the admin lesson tree |
| T-CLS-2 | P0 | For the "complete", "partial" and "no notes" subjects: confirm each state renders correctly and links do not dead-end |
| T-CLS-3 | P0 | Read a maths-heavy topic and a chemistry topic on mobile; confirm formulae are legible and not clipped |
| T-CLS-4 | P0 | Take a topic quiz: answer, submit, view explanations, return to the topic; confirm standing changes only when evidence warrants |
| T-CLS-5 | P1 | Topic practice and its result page: score, review, retry |
| T-CLS-6 | P1 | Direct URL to a topic of a class the student has not reached: allowed or blocked per rule (VERIFY); no data leak either way |
| T-CLS-7 | P1 | Deep link to a topic from a notification or a plan item |
| E-CLS-1 | P1 | Admin edits a lesson while a student has it open; refresh shows the new content, no stale cache beyond the documented one-hour catalogue cache |
| E-CLS-2 | P1 | Very long topic list (40+ topics) scrolls and filters without jank |
| E-CLS-3 | P2 | Unknown subject slug or topic slug: 404 |

### 3.6 Questions, practice modes (general behaviour)

These rules apply to every timed or untimed attempt in 3.7 and 3.8.

| ID | Pri | Requirement |
|---|---|---|
| R-PRAC-1 | P0 | Question payloads sent to the client must not include `correctAnswer` or `explanation` for an in-progress attempt. **Known exception:** the public `GET /api/questions` list currently does include them (backend-port doc, rule 7). Log it as a security finding, do not silently pass it |
| R-PRAC-2 | P0 | Timed attempts show a visible countdown and auto-submit at zero |
| R-PRAC-3 | P0 | Past-paper attempts are always timed; "untimed" applies only when no exam type is present |
| R-PRAC-4 | P0 | Answers, current question index and away-event count survive refresh and are restored from storage (session key e.g. `past-paper:v2:{exam}:{subject}:{year}`) |
| R-PRAC-5 | P0 | Submit is idempotent: a second submit of a completed attempt replays the stored result; no duplicate attempt or double scoring |
| R-PRAC-6 | P0 | Leaving the exam by navigating away shows a guard prompt for same-origin link clicks, and not for hash links, new-tab opens, downloads or `mailto:`/`tel:` |
| R-PRAC-7 | P0 | Focus loss is recorded with `visibilitychange` only (never `blur`), ignores absences under **3 seconds**, caps at 10,000 events, and shows on high-stakes results |
| R-PRAC-8 | P1 | Flag-for-review and the question navigator reflect answered, unanswered and flagged states accurately |
| R-PRAC-9 | P1 | The explanation modal shows the correct answer and explanation after the attempt (or per-question where designed) |
| R-PRAC-10 | P1 | Exiting practice early offers a clear choice and does not lose recorded evidence |

### 3.7 Practice modes (specific)

**Routes:** `/practice`, `/practice/past-questions`, `/practice/past-questions/[subject]`, `/practice/cbt`, `/practice/cbt/session`, `/practice/mock-exam`, `/practice/mock-exam/session`, `/practice/results/[attemptId]`.

**Exam configuration that must be exact:**

| Mode | Rule |
|---|---|
| JAMB CBT simulation | **180 questions, 120 minutes, 400 marks.** English is compulsory with **60** questions; three chosen subjects have **40** each; each subject is scored out of **100**. Four subjects total. Subjects must share a year with a full paper |
| JAMB band (from 400) | ≥300 Excellent; ≥250 Strong; ≥200 Good; ≥160 Fair; below 160 Needs work |
| WAEC/NECO grade (from %) | ≥75 A1; ≥70 B2; ≥65 B3; ≥60 C4; ≥55 C5; ≥50 C6; ≥45 D7; ≥40 E8; below 40 F9. A1–C6 are credits; D7–E8 are passes; F9 fails |
| Negative marking | None |
| Past-paper first page | Fetches the first page, then appends further pages via `.../past-paper/{attemptId}/more` as the student progresses |

| ID | Pri | Requirement / test |
|---|---|---|
| R-EXAM-1 | P0 | The JAMB picker forces English and exactly three others; it lists only years where every chosen subject has a full paper (`sharedYears`) and shows a clear empty state when none exists |
| R-EXAM-2 | P0 | The CBT session mirrors the JAMB interface: subject tabs, per-subject navigator, 120-minute global timer, auto-submit |
| R-EXAM-3 | P0 | Scoring: each subject out of 100 and total out of 400; the band and remark match the table above |
| R-EXAM-4 | P0 | WAEC/NECO/mock results display the correct A1–F9 grade for the boundary percentages (test 39, 40, 44, 45, 49, 50, 59, 60, 69, 70, 74, 75) |
| R-EXAM-5 | P0 | Mock exams honour the configured time limit and subject scope; board options (WAEC/NECO/JAMB) load from `mock-exam/boards` and `mock-exam/options` |
| R-EXAM-6 | P1 | Results page shows score, grade/band, per-subject breakdown, per-question review with explanations, time taken, and abandonment and focus-loss counts |
| R-EXAM-7 | P1 | History (past-paper and JAMB CBT) lists previous attempts with correct scores and opens the saved result |
| R-EXAM-8 | P1 | Subjects and years with no questions are hidden or disabled; an uncached paper is handled without a dead end |
| T-EXAM-1 | P0 | Full 180-question JAMB simulation to completion on desktop; then the same on a 390px phone |
| T-EXAM-2 | P0 | Start a CBT, answer some, **refresh**: state restored; answer more; submit; result correct |
| T-EXAM-3 | P0 | Let the timer reach zero: auto-submit fires once, result appears, no duplicate attempt |
| T-EXAM-4 | P0 | Boundary scoring: craft attempts that land on each grade boundary and confirm the grade shown |
| T-EXAM-5 | P0 | Switch tabs for 2 s (not recorded) and for 5 s (recorded); confirm the count on the result |
| T-EXAM-6 | P0 | Click an in-app link mid-exam: guard appears; Cancel keeps the exam intact; Leave abandons per rules and records abandonment |
| T-EXAM-7 | P0 | Double-click Submit; submit then hit Back and re-submit: one result only |
| T-EXAM-8 | P0 | Open the same exam in two tabs, answer differently, submit in both: no corruption, deterministic outcome (a lost race returns 409 only when the attempt is no longer in progress) |
| T-EXAM-9 | P1 | Mock exam for each board with scoped subjects; verify time limit and subject count |
| T-EXAM-10 | P1 | Past questions: choose subject and year, page past the first batch, confirm "more" loads without repeating or skipping questions |
| T-EXAM-11 | P1 | Open an old result link belonging to another user (change the `attemptId`): access denied, no data leak |
| E-EXAM-1 | P0 | Network drops during submit: no lost answers; the UI offers retry and the retry is safe (idempotent) |
| E-EXAM-2 | P1 | Questions with images (mirrored Cloudinary): load, and degrade gracefully when an image fails |
| E-EXAM-3 | P1 | Questions with maths, tables and long options render without overflow |
| E-EXAM-4 | P1 | Clock manipulation: change the device clock mid-exam. Timing should be authoritative (VERIFY server vs client time) |
| E-EXAM-5 | P2 | Keyboard-only exam: navigate, select an option, flag, submit |
| E-PRAC-6 | P0 | Session token expires mid-exam: the student is not silently logged out with answers lost; after re-login, state is recoverable or the loss is explained (VERIFY) |

### 3.8 Results, grading and review

Covered by R-EXAM-3 to R-EXAM-7. Additionally:

| ID | Pri | Requirement / test |
|---|---|---|
| R-RES-1 | P0 | The grade on the results page, history list and any dashboard tile for the same attempt is identical |
| R-RES-2 | P1 | Theory and fill-in-the-blank questions follow the documented marking behaviour (VERIFY how they are scored); OBJECTIVE is scored automatically |
| T-RES-1 | P0 | Compare one attempt's score across results page, history, performance page and dashboard |
| T-RES-2 | P1 | Zero-answered attempt and fully correct attempt: no division-by-zero, sensible copy |

### 3.9 Flashcards (spaced repetition)

**Routes:** `/flashcards`, `/flashcards/[deckId]`, `/flashcards/stats`. Gate: `flashcards` (STANDARD; **open to every tier during the beta**).

| ID | Pri | Requirement / test |
|---|---|---|
| R-FC-1 | P0 | Decks can be built from a lesson (cloze, basic and objective cards); a lesson already carded shows "Already built · N cards" and cannot be duplicated |
| R-FC-2 | P0 | Preview before building shows the cards that will be created; lessons are ordered finished, then read-through, then part-read |
| R-FC-3 | P0 | A study session presents due cards, accepts a rating, and shows the next-review interval under each rating |
| R-FC-4 | P0 | Each review writes a log; the next due date moves per the algorithm and persists across reload |
| R-FC-5 | P1 | Enrolment, deck deletion (with confirmation) and per-deck analytics work; the stats page matches the reviews performed |
| R-FC-6 | P1 | Cards stay linked to their source lesson and show a diff when the lesson changes |
| R-FC-7 | P1 | Recommendations list sensible decks to review |
| R-FC-8 | P0 | When the beta gate is removed (`BETA_OPEN_FEATURES` emptied), FREEMIUM sees an upgrade prompt, STANDARD and above retain access |
| T-FC-1 | P0 | Build a deck from a lesson, study 10 cards across all rating options, reload, check stats |
| T-FC-2 | P0 | Study to the end of the due queue: "all caught up" state |
| T-FC-3 | P1 | Delete a deck: confirmation, removal, and that its stats and the dashboard session no longer reference it |
| T-FC-4 | P1 | Edit the lesson in admin, then reopen the deck: diff shown |
| T-FC-5 | P0 | Rate rapidly and double-tap a rating: one review logged per card |
| E-FC-1 | P1 | A lesson with no card-worthy blocks: clear message, no empty deck created |
| E-FC-2 | P2 | Cloze cards with long text and LaTeX |

### 3.10 Study plan, timetable and daily scope

**Route:** `/study-plan`. Gate: `studyPlanner` (STANDARD; **open to every tier during the beta**).

**Modes:** term (follows the school term), blended, exam (backwards from the exam date). A plan carries its own **class and term scope**, credits completed lessons, limits subjects to the student's track, revises only fading topics from its scope or earlier, replans from mastery and pre-tests, and can be deleted and regenerated.

**Timetable editor.** Modes SMART or CUSTOM. Weekdays 1–7 (Mon–Sun). Session length is **30 minutes**. Per-day minutes; allocations of a subject to a day with PREFERRED or PINNED strength.

| ID | Pri | Requirement / test |
|---|---|---|
| R-PLAN-1 | P0 | Setup creates a plan, shows a loader while it is generated, then the schedule and week overview |
| R-PLAN-2 | P0 | The student can choose class and term; picking a class different from their profile triggers a confirmation modal |
| R-PLAN-3 | P0 | Topic selection stays strictly inside the plan's class and term; unmapped topics are left out |
| R-PLAN-4 | P0 | Timetable validation errors match: a **rest day** cannot have study time or a subject; a study day needs at least 30 minutes ("TOO_SHORT"); a subject cannot appear twice on one day ("DUPLICATE_ALLOCATION"); a day's subject minutes cannot exceed its capacity |
| R-PLAN-5 | P0 | A timetable that passes client checks can still be rejected by the backend; the review step surfaces the backend's issues without losing the draft |
| R-PLAN-6 | P0 | Delete plan: confirmation, removal, and a fresh-setup state afterwards |
| R-PLAN-7 | P1 | Completed lessons are credited; plan items tick; a replan keeps progress and reflects new mastery |
| R-PLAN-8 | P1 | During term gaps or holidays, active plans backfill to the upcoming or live term; calendar wording agrees with the planner |
| R-PLAN-9 | P1 | If no academic term covers the next 30 days, the UI falls back as designed and the wording follows the plan's scope |
| R-PLAN-10 | P1 | Reminder opt-in card appears and links to the push opt-in (3.13) |
| R-PLAN-11 | P1 | Unmet notice appears when the requested timetable cannot be fully scheduled, and explains why |
| T-PLAN-1 | P0 | Create a plan on ACC-F1 (term mode) and ACC-F2 (exam mode with exam date) and compare the generated items to the scope |
| T-PLAN-2 | P0 | Build a CUSTOM timetable that violates each rule above; confirm each message and the highlighted day |
| T-PLAN-3 | P0 | Change class on the plan from SS1 to SS2: topics regenerate within the new scope |
| T-PLAN-4 | P1 | Delete and recreate a plan; confirm no ghost items on the dashboard |
| T-PLAN-5 | P1 | Exam date in the past, today, and far future (> 1 year) |
| T-PLAN-6 | P1 | Daily-hours budget at minimum and maximum (VERIFY bounds from the form) |
| T-PLAN-7 | P1 | Plan with a subject that has no topics or no notes |
| E-PLAN-1 | P1 | Two tabs editing the plan at once: last write wins without corruption |
| E-PLAN-2 | P2 | Plan view on 360px: schedule and week overview readable |

### 3.11 Performance and analytics

**Routes:** `/performance`, `/performance/subjects`. Gate: `advancedAnalytics` (PREMIUM; **open to every tier during the beta**).

| ID | Pri | Requirement / test |
|---|---|---|
| R-PERF-1 | P0 | With too little evidence the UI states "not enough data yet" and withholds a confident verdict and predicted grade band |
| R-PERF-2 | P0 | With enough evidence it shows accuracy, attempts, latest grade, subject metrics and predicted grade bands that agree with the underlying attempts |
| R-PERF-3 | P0 | Mastery bands (Weak, Developing, Competent, Strong) and gap classes (WEAK, DECAYED, BOTTLENECK, ABANDONED, UNTOUCHED) display consistently across performance, classroom, dashboard and topic standing |
| R-PERF-4 | P1 | Topic standing explains where the student stands on a topic and why, in plain language |
| R-PERF-5 | P1 | Weak topics come from the evidence layer, not raw wrong-answer counts |
| R-PERF-6 | P1 | Charts (Recharts) render, have labels and legends, and work on mobile; colour is not the only differentiator |
| T-PERF-1 | P0 | ACC-N1: empty state. ACC-F2 after seeded attempts: numbers reconcile with the attempts |
| T-PERF-2 | P0 | Answer a batch of questions in one topic correctly, then wrongly: standing moves in the right direction with sensible damping |
| T-PERF-3 | P1 | Time decay: use a seeded old account (or backdated data) to confirm decayed topics appear as DECAYED |
| T-PERF-4 | P1 | Reconcile one subject's numbers against the admin student detail |
| E-PERF-1 | P1 | `PerformanceMetric.masteryLevel` is a known stale field (written only by topic practice and pre-test). If any UI element reads it, log a defect |

### 3.12 Astra, the AI study assistant (beta)

**Surface:** floating panel and entry points ("Ask Astra") from lessons and pages; history; streaming answers over SSE. Gate: `aiTutor` (PREMIUM; **open to every tier during the beta**).

| ID | Pri | Requirement / test |
|---|---|---|
| R-AST-1 | P0 | The panel opens from any entry point, carries the page context (page, topic, override) and shows suggestion chips |
| R-AST-2 | P0 | Answers stream token by token; Stop halts the stream cleanly; a retry produces a fresh answer |
| R-AST-3 | P0 | Messages render markdown and LaTeX, **escape raw HTML** (no script or markup injection), and format maths delimiters correctly |
| R-AST-4 | P0 | Input is capped at **8,000 characters**; over-length input is blocked with a message |
| R-AST-5 | P0 | The quota or limit message appears when the per-user limit is hit and is clear and non-blaming |
| R-AST-6 | P0 | Guardrails: off-curriculum, harmful, or prompt-injection attempts are refused or redirected politely. Answers stay grounded in the curriculum |
| R-AST-7 | P0 | Proposals (for example a study timetable) require explicit approval; nothing changes until the student approves; rejecting changes nothing. Approved timetable proposals actually appear in the study plan |
| R-AST-8 | P1 | Thread history: list, open, paginate older messages, rename, delete; reopening shows the right thread, not a stale one |
| R-AST-9 | P1 | Reconnect: a dropped stream resumes or fails gracefully, with no duplicated messages (event cursor keeps up to 400 ids) |
| R-AST-10 | P1 | Feedback (helpful or not) on a message is saved |
| R-AST-11 | P1 | Focus trap and keyboard: Esc closes, Tab stays inside the panel, focus returns to the opener |
| R-AST-12 | P1 | When the feature is gated (beta removed), FREEMIUM sees the locked state with an upgrade path |
| T-AST-1 | P0 | Ask a curriculum question from a lesson; confirm the answer is relevant and cites the context |
| T-AST-2 | P0 | Ask for a timetable; review the proposal; approve; confirm it in the plan. Repeat with reject |
| T-AST-3 | P0 | Attempt injection: "ignore previous instructions", request for the system prompt, requests for exam answers, off-topic content, and content unsuitable for minors |
| T-AST-4 | P0 | Paste `<script>`, `<img onerror>` and markdown links with `javascript:` into a message; nothing executes |
| T-AST-5 | P1 | Hit the usage limit; confirm the message and that the composer state is sensible |
| T-AST-6 | P1 | Kill the network mid-stream; restore; confirm behaviour and no duplicates |
| T-AST-7 | P1 | Long conversation (50+ messages): scroll performance, pagination |
| E-AST-1 | P1 | Open Astra on a slow 3G connection: first token latency acceptable, loading state present |
| E-AST-2 | P2 | Switch pages while a stream is running: stream is cancelled or continues without orphaning |

### 3.13 Notifications, push and announcements

**Routes:** `/notifications`; bell in the shell; settings section. Push needs `NEXT_PUBLIC_PUSH_ENABLED=true` and a VAPID public key.

| ID | Pri | Requirement / test |
|---|---|---|
| R-NOT-1 | P0 | The bell shows an accurate unread count; opening a notification marks it read; "mark all read" works and persists |
| R-NOT-2 | P0 | In-app notifications deep-link to the right page |
| R-NOT-3 | P0 | Push opt-in asks for browser permission only after an explicit user action; denying leaves the UI coherent and offers a way back |
| R-NOT-4 | P0 | Notification preferences save and are honoured: disabled categories send nothing |
| R-NOT-5 | P0 | Study reminders fire at the chosen time in **Lagos time**, once per day (idempotent) |
| R-NOT-6 | P1 | Revoking a device (device limit) removes its push subscription |
| R-NOT-7 | P1 | Admin announcements show to the targeted audience, can be dismissed per user, and respect schedule and cancellation |
| R-NOT-8 | P1 | With push disabled by flag, no push UI is offered at all |
| T-NOT-1 | P0 | Subscribe on Chrome Android and Windows; trigger a reminder through the cron endpoint; receive and click it |
| T-NOT-2 | P0 | Unsubscribe then re-subscribe; confirm a single subscription row, no duplicates |
| T-NOT-3 | P1 | Deny the permission prompt; revisit the settings card |
| T-NOT-4 | P1 | iOS Safari: push works only when installed as a PWA. Confirm the copy explains this (VERIFY) |
| T-NOT-5 | P1 | Admin sends a test announcement and a scheduled one; cancel before it fires |
| E-NOT-1 | P1 | Cron secret unset: the endpoint returns 204 silently. A wrong bearer returns 401. Do not mistake the former for a working reminder |
| E-NOT-2 | P2 | Hundreds of notifications: list pagination and performance |

### 3.14 Settings and profile

**Routes:** `/settings`, `/settings/billing`. Sections: profile, academic details, avatar, password, notifications, subscription.

| ID | Pri | Requirement / test |
|---|---|---|
| R-SET-1 | P0 | Profile (name, phone, state, school) validates and saves; changes show immediately across the app |
| R-SET-2 | P0 | Changing class or track warns first, then refreshes the library, plan and dashboard scope |
| R-SET-3 | P0 | Avatar upload accepts valid images and rejects wrong types and oversize files (VERIFY limits), with a clear message; the new avatar shows everywhere |
| R-SET-4 | P0 | Password change requires the current password, enforces the minimum length (**6**) and signs out other sessions or not as designed (VERIFY) |
| R-SET-5 | P1 | Notification preferences persist (3.13) |
| R-SET-6 | P1 | The subscription section shows the correct current tier, status, period and renewal or expiry |
| T-SET-1 | P0 | Edit each field; save; reload; confirm persistence. Try empty, whitespace-only, very long and emoji values |
| T-SET-2 | P0 | Change class SS1 → SS2: warning, confirm, check classroom, plan, library and dashboard |
| T-SET-3 | P0 | Upload a JPG, PNG, WebP, a 20 MB image, a PDF renamed to `.jpg`, and an SVG |
| T-SET-4 | P0 | Wrong current password; mismatched confirmation; new password equals old |
| E-SET-1 | P1 | Concurrent edit in two tabs |

### 3.15 Subscription tiers, billing and gating

**Tiers:** FREEMIUM (shown as "Free"), STANDARD (shown as "Basic" on the marketing site and in the app's plan picker; "Standard" in the admin console), PREMIUM ("Premium"). Both names are intentional; verify each surface uses the right one.

**Prices in code (kobo → naira) — VERIFY against the pricing page, because pricing is still being finalised:** Basic ₦2,500/month, ₦24,000/year; Premium ₦5,000/month, ₦50,000/year.

**Entitlement matrix.**

| Feature | Paid requirement | Beta behaviour (now) |
|---|---|---|
| Flashcards | STANDARD | Open to every tier |
| Study planner | STANDARD | Open to every tier |
| Advanced analytics (subject breakdown) | PREMIUM | Open to every tier |
| Astra AI tutor | PREMIUM | Open to every tier |
| Premium library resources | PREMIUM | **Gated** |

Free-tier numeric caps (3 subjects, 25 practice questions a day, 1 mock exam) are **advertised but not enforced**. Do not expect enforcement. Do record any place the UI implies a cap it does not apply.

| ID | Pri | Requirement / test |
|---|---|---|
| R-BIL-1 | P0 | Premium library resources are locked for FREEMIUM and STANDARD with an upgrade prompt naming the required tier ("Upgrade to X"), and open for PREMIUM |
| R-BIL-2 | P0 | An unknown or missing tier is treated as FREEMIUM (fail closed) |
| R-BIL-3 | P0 | A richer tier never loses a feature a poorer tier has |
| R-BIL-4 | P0 | Plan picker shows the right plans and prices for monthly and yearly; selecting one starts Paystack checkout (hosted redirect) |
| R-BIL-5 | P0 | After a successful test payment the tier updates (settlement via webhook) and the UI reflects it without a manual logout; a pending state is shown while the webhook is in flight |
| R-BIL-6 | P0 | Failed, abandoned and cancelled payments leave the tier unchanged and show a clear message; the student can retry |
| R-BIL-7 | P0 | With `NEXT_PUBLIC_BILLING_ENABLED` not `true`, no checkout is offered; if enabled but the backend is unconfigured, the 503 is shown gracefully |
| R-BIL-8 | P0 | Admin comp or tier override changes entitlements; revocation downgrades correctly; the subscription section shows source (PAYSTACK or COMP) and status (PENDING, ACTIVE, FAILED, ABANDONED, REVOKED) |
| R-BIL-9 | P0 | Gating is enforced by the backend, not just hidden in the UI. Call a gated endpoint directly with a FREEMIUM token and expect a refusal |
| T-BIL-1 | P0 | Paystack test card success, insufficient funds, declined, 3-D Secure, and closing the checkout tab mid-way. After each, check tier, status and UI |
| T-BIL-2 | P0 | Pay, then immediately reload the app before the webhook arrives; confirm the pending state resolves |
| T-BIL-3 | P0 | Comp ACC-F1 to PREMIUM in the admin console, then revoke; confirm the effect on library, device limit and tier badge |
| T-BIL-4 | P0 | Direct API call to a premium-only endpoint with a FREEMIUM token: refused (record status) |
| T-BIL-5 | P1 | Upgrade from STANDARD to PREMIUM mid-period and downgrade; confirm tier and messaging (VERIFY proration rules) |
| T-BIL-6 | P1 | Landing-page pricing vs in-app plan picker vs this matrix: record every mismatch |
| T-BIL-7 | P1 | Device limit applies at STANDARD and above and not to FREEMIUM |
| E-BIL-1 | P0 | Double-click Pay: one checkout, one charge |
| E-BIL-2 | P1 | Webhook replay and out-of-order events do not corrupt the tier (observe from the FE; coordinate with backend QA) |

### 3.16 Library

**Route:** `/library`. Per-subject resources (textbooks, videos, PDFs, worksheets, past papers) with free and premium flags and an in-app PDF reader. Private files use **signed, short-lived Cloudinary links**.

| ID | Pri | Requirement / test |
|---|---|---|
| R-LIB-1 | P0 | Library lists resources for the student's class and track; a subject with no resources shows an empty state (a previous defect showed no subject at all) |
| R-LIB-2 | P0 | Premium resources are locked for lower tiers (R-BIL-1) and never reachable by guessing a URL |
| R-LIB-3 | P0 | PDFs open in the in-app reader with page navigation and zoom, on mobile too |
| R-LIB-4 | P0 | Signed links expire; after expiry, reopening requests a fresh link instead of showing a broken file |
| R-LIB-5 | P1 | Changing class or track refreshes the library |
| T-LIB-1 | P0 | Open a free PDF as FREEMIUM; a premium one as FREEMIUM and PREMIUM |
| T-LIB-2 | P0 | Copy a signed URL, wait past expiry, reopen: denied; the app recovers by re-signing |
| T-LIB-3 | P1 | Large PDF (50+ pages) on a slow network: progressive loading, no freeze |
| T-LIB-4 | P1 | Open a resource link logged out: denied |
| E-LIB-1 | P2 | Video resource type behaviour (video lessons are not built; these are library links) |

### 3.17 Achievements and streaks

**Route:** `/achievements`. Criteria: first lesson (First Step), 10 questions (Question Starter), 100 (Century), 1,000 (Thousand Club), 3/7/30-day streaks, 100% on a quiz (Sharp Shooter), "Strong" mastery in a subject (Subject Master), mock score above 70% (Mock Champion).

| ID | Pri | Requirement / test |
|---|---|---|
| R-ACH-1 | P0 | Each badge shows locked or unlocked, with accurate progress toward the next threshold |
| R-ACH-2 | P0 | Unlock fires exactly once, shows an unlock toast, and persists across sessions and devices |
| R-ACH-3 | P0 | Streaks count in **Lagos time**: two sessions in one Lagos day count once; a missed day resets; copy is encouraging, not shaming |
| R-ACH-4 | P1 | Badge icons load (achievement icon URL); a missing icon degrades to a placeholder |
| T-ACH-1 | P0 | Cross each threshold deliberately (answer the 10th, 100th question; 3rd consecutive day) and watch the unlock |
| T-ACH-2 | P0 | Score exactly 70% and 71% on a mock exam: confirm the "above 70%" rule |
| T-ACH-3 | P1 | Answer across the Lagos midnight boundary to test the streak |
| E-ACH-1 | P1 | Progress counts match the evidence in performance; duplicates do not inflate counts |

### 3.18 Admin console

**Routes:** `/admin/login`, `/admin/forgot-password`, `/admin/reset-password`, and under `/admin`: overview, questions (list, new, edit, import, coverage), lessons (browse, upload), curriculum, terms, library, announcements, students (list, detail), team, audit, Astra. The admin realm uses its **own secret and cookie**.

| ID | Pri | Requirement / test |
|---|---|---|
| R-ADM-1 | P0 | Admin login, forgot and reset work independently of the student app; the student session cannot open `/admin` |
| R-ADM-2 | P0 | Owner-only actions (force sign-out, student deletion, creating and revoking admins) are available to ADM-O and blocked for ADM-A **in the backend**, not only hidden in the UI |
| R-ADM-3 | P0 | Question create and edit enforce: subject required; question text ≥ 5 characters; correct answer required; explanation ≥ 5 characters; year between 1990 and 2030; marks ≥ 1; time estimate ≥ 10 seconds; objective questions must satisfy the option and answer invariants |
| R-ADM-4 | P0 | Bulk import enforces: subject code ≥ 2 characters; **at least 4 options** for objective questions; valid exam type (WAEC, JAMB, NECO, CUSTOM); defaults (type OBJECTIVE, difficulty INTERMEDIATE, marks 1, time 90 s); duplicate detection; per-row error reporting without importing a bad file halfway silently |
| R-ADM-5 | P0 | Question coverage tab shows coverage per subject and exam; paper preview and downloads work; export failures are shown beside the buttons and cleared per attempt |
| R-ADM-6 | P0 | Lesson upload and browse work with the natural note format; an uploaded lesson appears in the student classroom after the cache window (catalogue cache is one hour unless explicitly busted) |
| R-ADM-7 | P0 | Student list: filters and pagination; detail: profile edit, tier override, suspension, deletion with a **deletion-impact** preview |
| R-ADM-8 | P0 | Every admin write creates an audit-log entry with actor and entity; the audit viewer filters by entity and actor |
| R-ADM-9 | P1 | Announcements: preview, test send, schedule, cancel; audience targeting is correct |
| R-ADM-10 | P1 | Academic terms CRUD: overlapping or reversed dates are rejected; the student study plan follows the configured terms |
| R-ADM-11 | P1 | Library materials: upload, sign, edit, delete; free and premium flag respected on the student side |
| R-ADM-12 | P1 | Admin Astra: threads, streaming, and **proposal-and-approve** execution: no action runs without approval; approved actions are audited |
| T-ADM-1 | P0 | Create a question via the form, then via import; both appear in the student practice pool for the right subject, topic and exam |
| T-ADM-2 | P0 | Import files with: 3 options, missing answer, bad exam type, duplicate rows, year 1989 and 2031, invalid JSON, very large file |
| T-ADM-3 | P0 | ADM-A attempts each owner-only action via the UI and via direct API call |
| T-ADM-4 | P0 | Suspend a student, force sign-out, then delete a test student; verify each takes effect and is audited |
| T-ADM-5 | P1 | Run a lesson upload with malformed markdown, LaTeX, images and very long content |
| T-ADM-6 | P1 | Edit and delete a question that is used in attempts: the usage check warns |
| E-ADM-1 | P0 | Admin session expiry mid-form: unsaved work is not silently lost without a message |
| E-ADM-2 | P1 | Admin pages on a tablet (768px): tables scroll within their container |

---

## 4. Cross-cutting requirements

### 4.1 Responsive and mobile

| ID | Pri | Requirement |
|---|---|---|
| R-X-1 | P0 | No horizontal page scroll at 360px on any student route. Tables and charts scroll inside their own containers |
| R-X-2 | P0 | Touch targets are at least 44×44 px for primary actions (answer options, rating buttons, submit, navigation) |
| R-X-3 | P0 | On-screen keyboard does not hide the composer (Astra), form submit buttons or exam navigation |
| R-X-4 | P1 | Orientation change mid-exam does not reset state |
| R-X-5 | P1 | Installable as a PWA: manifest, icons, splash and the offline page |

### 4.2 Accessibility (target WCAG 2.1 AA)

| ID | Pri | Requirement |
|---|---|---|
| R-A11Y-1 | P0 | Every interactive element is reachable and operable by keyboard with a visible focus indicator |
| R-A11Y-2 | P0 | Colour contrast ≥ 4.5:1 for text and ≥ 3:1 for large text and UI components in the navy, blue and gold brand palette, in every state (disabled, hover, error) |
| R-A11Y-3 | P0 | Form fields have labels; errors are announced to screen readers and tied to their field |
| R-A11Y-4 | P1 | Modals and the Astra panel trap and restore focus; Esc closes |
| R-A11Y-5 | P1 | Charts have text alternatives; status is never conveyed by colour alone (mastery bands, grade, badges) |
| R-A11Y-6 | P1 | Respect `prefers-reduced-motion` for celebratory and unlock animations |
| R-A11Y-7 | P1 | Maths content has an accessible form or readable fallback |

### 4.3 Performance and resilience

| ID | Pri | Requirement |
|---|---|---|
| R-PERFX-1 | P1 | Largest Contentful Paint ≤ 2.5 s on a mid-range Android over Fast 3G for the landing page and dashboard (record actuals; set the team's own budget if different) |
| R-PERFX-2 | P0 | Every data-driven screen has loading, empty, error and retry states. No infinite spinners |
| R-PERFX-3 | P0 | A backend 5xx or timeout never shows raw JSON, a stack trace or a white screen; the global error page appears with a recovery action |
| R-PERFX-4 | P1 | A 401 anywhere clears the session and routes to login without a loop |
| R-PERFX-5 | P1 | Slow and offline networks during an exam or flashcard session do not lose data |

### 4.4 Data integrity and consistency

- The same metric (score, grade, mastery band, streak, tier) is identical wherever it appears.
- Learning events are append-only. A user action should never need to "undo" evidence; if the UI offers deletion (plans, decks), confirm what it removes and what remains in the ledger.
- Time and date: all streak, plan and reminder calendars use `Africa/Lagos`. Check display formatting of dates and `₦` amounts (`en-NG`).

### 4.5 Security (light pass, FE-observable)

| ID | Pri | Check |
|---|---|---|
| S-1 | P0 | No student can read another student's attempt, plan, deck, thread or notification by changing an ID in the URL or request (IDOR) |
| S-2 | P0 | Student token against `/admin/api/*` returns 401/403; admin token against student routes behaves as designed |
| S-3 | P0 | Stored-XSS attempts via profile name, school, announcement text, lesson markdown, question text, Astra messages, and thread names do not execute |
| S-4 | P0 | In-progress quiz payloads omit `correctAnswer` and `explanation` (R-PRAC-1). Record the public `/api/questions` exposure as a finding |
| S-5 | P0 | `callbackUrl` and OAuth `state` cannot be abused to redirect off-site (E-AUTH-1) |
| S-6 | P1 | No secrets in the client bundle or env: only `NEXT_PUBLIC_*` values; no Paystack secret, VAPID private key or cron secret |
| S-7 | P1 | Logout invalidates the session; Back does not show cached gated content (check `Cache-Control` on gated pages) |
| S-8 | P1 | Rate limiting: repeated login failures, forgot-password spam and Astra spam are throttled with a friendly message |
| S-9 | P1 | Signed library links expire (T-LIB-2) |

### 4.6 Content quality

- Spot-check ingested, provider-sourced questions for: wrong or missing answer key, missing options, broken images, mis-tagged topics, duplicated questions, mojibake characters, and mathematical notation errors. Record **content faults per 1,000 questions served** (a launch metric).
- Record **lesson-note coverage per subject** (topics with notes ÷ topics in the curriculum). The launch gate is 100% for the launch subject set.

### 4.7 Analytics instrumentation (launch metrics must be observable)

Confirm the product can report these from real usage: activation (first practice session), week-2 retention, practice attempts per active user per week, share of users with enough data for a confident verdict, card and topic retention at 7 and 30 days, Today's Session completion rate, Astra usage and helpfulness, class-level mix. Flag any metric that has no source.

---

## 5. Regression pack and smoke test

### 5.1 Smoke test (run on every build, about 20 minutes, P0 only)

1. Landing page loads; Register (two steps) → Login → Dashboard.
2. Today's Session renders and a link opens a topic with notes and rendered maths.
3. Take a 10-question subject practice, submit, view the result and explanations.
4. Start a JAMB CBT, answer, refresh (state restored), submit.
5. Build a flashcard deck from a lesson and review five cards.
6. Create a study plan; open the timetable editor; save a valid timetable.
7. Open Performance: correct empty or populated state.
8. Open Astra, ask one question, see a streamed reply.
9. Open Library, open a free PDF; a premium resource is locked on FREEMIUM.
10. Upgrade through Paystack test checkout; tier changes to the paid tier.
11. Admin: log in, create a question, see it in student practice; audit log shows the write.
12. Sign out; Back button does not reveal gated pages.

### 5.2 Full regression

All P0 and P1 cases in section 3, on the P0 browsers and the 360px and 1280px viewports, plus section 4.

### 5.3 Triggers that demand a targeted re-test

| Change | Re-test |
|---|---|
| Curriculum, class or term logic | 3.5, 3.10, 3.4, 3.14 |
| Scoring, grading or mastery engine | 3.7, 3.8, 3.11, 3.17 |
| Subscription, entitlements or billing | 3.9–3.12, 3.15, 3.16 |
| Auth, tokens, cookies | 3.2, 3.18, 4.5 |
| Notifications or cron | 3.13, 3.10 reminder card |
| Lesson or question import | 3.5, 3.7, 3.18, 4.6 |
| Beta flag changes (`BETA_OPEN_FEATURES`) | Every gated feature at every tier |

---

## 6. Exit criteria for launch sign-off

| # | Criterion |
|---|---|
| 1 | All P0 test cases pass on the P0 browser and device matrix |
| 2 | No open P0 defects. Open P1 defects each have a written decision (fix, defer, accept) |
| 3 | Smoke test passes on the release candidate build |
| 4 | Exam accuracy verified: JAMB 180/120/400 with 60+40+40+40; every A1–F9 boundary; JAMB bands |
| 5 | Billing: all Paystack test scenarios pass and the tier reflects each outcome; go-live checklist (live keys, webhook URL and signature, a small internal live transaction) signed off |
| 6 | Entitlements: each tier verified against the matrix, including direct API calls; the beta-open features are listed and the plan to close the beta is agreed |
| 7 | Lesson-note coverage reported per subject; 100% for the launch subject set, and the product states plainly which subjects are not yet complete |
| 8 | Content QA sample completed on ingested questions, with fault rate recorded |
| 9 | Accessibility: no keyboard traps, contrast failures or unlabelled controls on P0 flows |
| 10 | Security pass: S-1 to S-5 pass, S-4 finding triaged |
| 11 | Landing-page claims match the app (R-PUB-4, T-BIL-6) |
| 12 | Cron-driven reminders confirmed working with a configured secret |

---

## 7. Known issues, gaps and decisions QA should not "fix by assumption"

| Item | Status | What QA should do |
|---|---|---|
| Free-tier numeric caps (3 subjects, 25 questions/day, 1 mock) | Advertised, **not enforced** | Do not file "cap not enforced" per feature. File one landing-page accuracy finding if copy overstates |
| Landing page lists **offline mode** under Premium | Not built | Log against the pricing page before it takes real money |
| Beta gates open to every tier (flashcards, planner, analytics, Astra) | Intentional | Re-test every gate when the beta ends |
| Prices in code | May change before launch | Verify against the final pricing page |
| `GET /api/questions` (public list) includes `correctAnswer` and `explanation` | Known backend behaviour | Record as a security finding and track to closure |
| `PerformanceMetric.masteryLevel` stale | Known | Log only if a UI surface reads it |
| `TERMII_*` (SMS/OTP) and `RESEND_API_KEY` | Reported unused | Confirm what the forgot-password email actually sends through; test deliverability to Gmail, Yahoo, and a Nigerian ISP mailbox |
| Teacher, school, marketplace, video | Not built | Out of scope |
| Gamification XP/levels and the repair stage | Planned only | Out of scope |
| Backend README is empty | Documentation gap | Not an FE defect |
| Catalogue cache is one hour | By design | After admin content changes, allow for the window or bust the cache before logging "content not updating" |
| Question count and coverage figures (about 13,000 topic-tagged questions, 20 years, three exam bodies) | Reported by the team deck, not verified | Record the true figures from the admin coverage tab |

### Defect report template

> **Title** · **Build/commit** · **Env and flags** · **Account (ACC-/ADM- ID)** · **Browser/device/viewport/network** · **Steps** · **Expected (cite R-/T- ID)** · **Actual** · **Network evidence (endpoint, status, body)** · **Console errors** · **Screenshot or video** · **Severity (P0/P1/P2)** · **Regression? (last known good build)**

Severity guide: **P0** blocks launch (data loss, wrong score or grade, payment or tier error, security leak, cannot register or log in, exam cannot be completed). **P1** major feature impaired, with a workaround. **P2** cosmetic or minor.
