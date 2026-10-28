# ScholarsCrib Gamification Enhancement Implementation Plan

**Document type:** Engineering implementation specification  
**Product:** ScholarsCrib — Nigerian secondary-school exam preparation  
**Target exams:** 2027 WAEC/WASSCE, JAMB UTME, and NECO SSCE  
**Purpose:** Guide an AI coding agent through a safe, incremental implementation of a more engaging, learning-focused gamification system.

---

## 1. Mission and product principles

Enhance the existing ScholarsCrib application with gamification that encourages consistent study, deliberate practice, revision, improvement, and demonstrated mastery. Build on the existing Achievements page rather than replacing working product flows unnecessarily.

The desired student loop is:

1. Receive a clear, achievable learning goal.
2. Complete a lesson, practice set, flashcard review, or planned study session.
3. See meaningful feedback about effort and learning progress.
4. Earn XP, make progress toward a level or achievement, and celebrate appropriately.
5. Receive a useful next recommendation based on learning evidence.

### Non-negotiable principles

- **Learning over points:** Do not reward meaningless activity more than genuine learning.
- **Improvement counts:** Reward correcting mistakes and improving, not just high scores.
- **Fairness:** Do not make leaderboards or rewards favour only students who can spend the most time online.
- **Encouragement:** Avoid shame, harsh streak-loss messaging, or discouraging locked states.
- **Honest progress:** Never claim mastery from one weak or unrepresentative attempt.
- **No pay-to-win:** XP, coins, badges, and levels must not be purchasable in a way that implies academic ability.
- **Accessible and responsive:** Support keyboard navigation, screen readers, reduced-motion preferences, mobile layouts, and low-bandwidth conditions.
- **Preserve existing product behaviour:** Inspect the repository and existing APIs before deciding how to implement anything.
- **Use real data:** Do not hardcode production XP, progress, mastery, or recommendations. Mock data may be used only in isolated previews and tests.
- **Do not invent backend capabilities:** If an API or event does not exist, document the gap and implement the appropriate layer only after examining the current architecture.

## 2. Existing state and starting point

The current Achievements page already shows or represents:

- Collection progress.
- First Step — complete the first lesson.
- Question Starter — answer the first 10 questions.
- Century — answer 100 questions.
- Thousand Club — answer 1,000 questions, with progress.
- 3-Day, 7-Day, and 30-Day Streak achievements.
- Sharp Shooter — score 100% on a quiz.
- Subject Master — reach “Strong” mastery in a subject.
- Mock Champion — score above 70% on a full mock exam.
- Locked/unlocked badge cards and progress indicators.

The screenshot also shows the existing application navigation: Classroom, Flashcards, Library, Practice, Study Plan, Performance, Achievements, Astra, and Settings.

### First task: audit before coding

1. Locate the current Achievements page and its route, layout, shared components, data-fetching hooks, and types.
2. Trace where question attempts, lessons, flashcards, study-plan completion, mock exams, and subject mastery are recorded.
3. Identify existing achievement rules and whether evaluation happens on the server, client, or both.
4. Identify the authentication/session model, API conventions, query-cache approach, notification/toast system, design tokens, and analytics.
5. Inspect current tests, lint rules, TypeScript rules, and repository instructions (`AGENTS.md`, README, package scripts, etc.).
6. Produce a brief implementation map before making changes: files to reuse, files likely to change, available APIs/events, and missing backend support.
7. Do not introduce a second achievement engine or duplicate existing tracking logic.

## 3. Scope and delivery order

Implement in the following phases, in order. Finish and verify each phase before moving to the next. Keep changes small enough to review and avoid unrelated refactors.

### Phase 0 — Repository and data audit

**Deliverables**
- Current route/component/API map.
- Existing event and achievement-rule inventory.
- Data gaps and recommended server/client responsibilities.
- A short implementation plan aligned to the actual codebase.

**Acceptance criteria**
- Existing flows and APIs are understood before code changes.
- Every planned feature is mapped to real data or explicitly marked as needing backend support.
- Existing achievements and progress values are not silently changed.

### Phase 1 — Gamification foundation: XP, levels, and event processing

Build the foundation before adding more reward surfaces.

#### 1.1 Define a canonical learning-event model

Use the existing event architecture if available. Otherwise, propose a typed domain model that can represent events such as:

- `lesson_completed`
- `practice_set_completed`
- `question_answered`
- `answer_corrected`
- `flashcard_review_completed`
- `study_session_completed`
- `study_plan_task_completed`
- `topic_mastery_demonstrated`
- `mock_exam_completed`
- `daily_quest_completed`

Adapt names and payloads to existing conventions. Include, where available, student ID, event ID, event timestamp, source activity ID, subject/topic ID, result/accuracy, and metadata needed to evaluate rewards.

#### 1.2 XP rules

Use these values as **initial product proposals**, not immutable truths. Centralize them in one typed configuration/rules module and tune later using real engagement and learning data.

| Event | Initial XP proposal | Rule |
|---|---:|---|
| Complete a lesson and its knowledge check | 30 | Award once per qualifying completion |
| Complete a practice set | 20 | Must meet the defined completion rule |
| Review a due flashcard set | 15 | Award for completing the review session, not every card flip |
| Correct a previously missed question | 5 | Award once per qualifying correction, subject to anti-farming rules |
| Complete a planned study session | 25 | Session must meet a minimum meaningful-completion rule |
| Demonstrate topic mastery | 50 | Award once per defined mastery milestone |
| Complete all daily quests | 30 bonus | Award once per day |

Rules:
- Do not give unlimited XP for refreshing pages, reopening activities, replaying a completed quiz without a qualifying rule, or repeatedly submitting the same event.
- Decide how partial completion, abandoned sessions, retries, offline activity, and provider question IDs are handled.
- Prefer server-authoritative XP calculation and balances. Never trust a client-supplied XP amount.
- Store a transaction/ledger for awarded XP with a unique idempotency key so duplicate requests cannot double-award.
- If the backend does not support this, document the required API/schema and implement frontend integration only against an agreed contract. Do not simulate persistent rewards in production.
- Explain the award in the UI, e.g. “+20 XP — practice set completed.”

#### 1.3 Level progression

Create a deterministic, documented level curve. Keep thresholds centralized and easy to tune. A simple initial proposal is 100 XP for Level 2, 250 cumulative XP for Level 3, 450 for Level 4, and progressively increasing thresholds. Do not scatter level formulas across components.

Requirements:
- Show current level, current XP, XP needed for the next level, and a progress bar.
- Use clear labels and accessible text; the bar must not be the only representation.
- Use titles such as Starter Scholar, Rising Scholar, Focused Learner, Subject Specialist, Exam Strategist, and ScholarsCrib Elite as cosmetic progression labels.
- Avoid suggesting that a level is an official academic qualification.
- Handle users at the maximum configured level and new users with no XP.
- Test level-boundary conditions.

**Acceptance criteria**
- XP is awarded only for eligible events and cannot be duplicated through repeated requests.
- XP totals, transaction history, and level progress remain consistent after reload and across devices.
- Existing achievement counts continue to work.
- Unit tests cover award rules, idempotency, and level thresholds.

### Phase 2 — Daily quests and weekly challenges

#### 2.1 Daily quests

Show three achievable missions on the dashboard and/or a dedicated quest surface. Generate quests from a student's available subjects, study plan, recent performance, and due revision items where the required data exists.

Suggested mission types:
- Warm-up: answer 5 questions.
- Focus mission: practise 10–15 questions in a relevant topic.
- Revision mission: review due flashcards or correct previously missed questions.

Requirements:
- Give each quest a title, concise description, progress, completion state, reward, and action that opens the correct activity.
- Define the student's timezone/day boundary consistently with the existing account settings or backend.
- Ensure daily quest assignment is stable for that day. Refreshing the page must not generate new quests or reset progress.
- Make quest completion idempotent.
- Award a completion bonus only once after all assigned quests are complete.
- Do not create a quest that the student cannot complete because they lack access to its subject/content.
- Provide empty, loading, error, and offline states.
- If a recommendation cannot be generated from available data, use a safe generic mission rather than fabricate weakness or progress.
- Do not punish students for missed days.

#### 2.2 Weekly challenges

Add a reusable challenge model that can support themed events such as:
- Mathematics Monday.
- Science Sprint.
- Past Questions Challenge.
- Weekend Revision Cup.

Requirements:
- Start with a small number of challenge templates and a clear start/end time.
- Make challenge requirements, eligibility, rewards, and completion rules visible before joining.
- Ensure timezone and event-boundary behaviour is tested.
- Avoid requiring students to study excessive hours.
- Do not implement real-time multiplayer unless explicitly approved and supported by the architecture.

**Acceptance criteria**
- Quest progress is derived from authoritative activity records.
- Quest assignment is stable and cannot be reset by refreshing.
- Challenge status changes correctly at boundaries.
- A completed mission links to a useful next action.

### Phase 3 — Streaks and supportive return journeys

Extend existing 3-, 7-, and 30-day streak achievements without breaking their semantics.

Requirements:
- Add a calendar/heatmap of meaningful study days.
- Define “study day” explicitly. A day should require a qualifying learning action, not merely opening the app.
- Add proposed 14-, 60-, and 100-day milestones if consistent with the existing achievement system.
- Offer supportive return messaging after a missed day, e.g. “Ready to get back on track? Start with a 5-minute review.”
- Consider a streak freeze only after reviewing the product economy, backend support, and fairness implications. It should be earned transparently, not sold as academic advantage.
- Handle timezone changes and daylight-saving changes correctly where applicable.
- Avoid duplicate day records and streak races from concurrent requests.

**Acceptance criteria**
- Streaks are consistent across sessions/devices and calculated from the agreed timezone.
- App opens alone do not extend a streak.
- Missing a day does not hide the next available action or shame the student.

### Phase 4 — Improve the Achievements page

Retain existing achievements and upgrade the experience incrementally.

#### 4.1 Achievement-card improvements
Each card should support:
- Badge illustration/icon and rarity where appropriate.
- Achievement name and short description.
- Locked, in-progress, and earned states.
- Progress count or percentage where meaningful.
- Clear next step to progress where meaningful.
- Earned date when available.
- Keyboard-accessible details.
- A reduced-motion-safe unlock celebration.

#### 4.2 Add new achievement categories
Suggested categories:
- Consistency: 3-, 7-, 14-, 30-, 60-, and 100-day streaks.
- Practice: first 10, 100, 1,000 questions, and subject-specific practice milestones.
- Improvement: personal-best score, score improvement, correction of missed questions.
- Revision: flashcard review consistency and due-card completion.
- Mastery: demonstrate reliable topic mastery and maintain it on a later check.
- Exam readiness: complete a full mock exam and improve across mock attempts.

Do not remove or rename existing achievements without checking references and preserving existing user-earned history. Avoid awarding mastery based on a single attempt. Define each badge's trigger and anti-abuse rule in one canonical rules source.

#### 4.3 Collection progress
- Explain what the collection percentage means.
- Ensure locked achievements have a useful, achievable next step where possible.
- Avoid showing an overall percentage that misleads users when achievements are hidden, seasonal, or not applicable.
- Make categories/filtering usable on mobile and with keyboard navigation.

**Acceptance criteria**
- All existing earned achievements remain earned after deployment.
- Each new achievement has documented criteria and tests.
- Earned dates and progress are correct and stable.
- Visual changes fit the current ScholarsCrib design system and dark/light theme conventions.

### Phase 5 — Subject mastery journeys

Create a visual topic journey only after identifying the authoritative syllabus, topic hierarchy, subject IDs, and mastery data.

Requirements:
- Show topic states such as upcoming, in progress, needs revision, and demonstrated mastery.
- Show prerequisites only when a genuine curricular relationship exists in data.
- Base mastery on evidence, such as performance over multiple attempts and/or spaced follow-up checks, rather than one quiz.
- Allow students to revisit prior topics and practise unlocked content; do not use gamification to unnecessarily block learning.
- Link each topic to its lesson, practice questions, flashcards, or revision action as available.
- Display uncertainty honestly when there is insufficient evidence.
- Keep exam tracks and subjects relevant to the student.

**Acceptance criteria**
- Topic maps use real syllabus data rather than hardcoded illustrative topic trees.
- No false prerequisite relationships are introduced.
- Mastery labels can be explained to students in plain language.
- The feature remains usable on small screens.

### Phase 6 — Comeback and improvement rewards

Reward meaningful improvement and persistence, including for students with low starting scores.

Requirements:
- Detect improvements using comparable assessments (same topic/difficulty or normalized scoring where possible).
- Avoid celebrating statistical noise from tiny samples.
- Use neutral, supportive language, e.g. “You improved from 52% to 68% across comparable practice.”
- Reward correcting previously missed questions and successful later recall.
- Do not publicly label students as weak or low-performing.
- Do not imply that an improved practice score guarantees an exam result.

**Acceptance criteria**
- Comparisons use valid, comparable attempts.
- Students receive encouragement without misleading academic claims.
- Tests cover missing baselines, small sample sizes, ties, and regressions.

### Phase 7 — Personalized “Your Next Move” dashboard card

Create a single focused recommendation card that suggests one useful action, rather than adding many competing dashboard widgets.

Possible recommendation inputs:
- Next incomplete Study Plan task.
- Due flashcards.
- A topic with evidence of needing revision.
- A lesson that has not been completed.
- An optional challenge if no urgent task exists.

Requirements:
- Use existing study-plan and performance data.
- Explain why the action is recommended.
- Show realistic estimated duration only when supported by data or clearly configured.
- Use an actionable button that opens the correct route and preserves navigation state where appropriate.
- Never invent a student's weakness, progress, deadline, or readiness.
- If data is unavailable, show a generic starter action without claiming it is personalized.
- Avoid excessive urgency, guilt, or manipulative notifications.

**Acceptance criteria**
- Recommendation is grounded in available data and has a valid destination.
- Loading, empty, error, and new-user states are supported.
- Only one primary recommended action is visually emphasized.

### Phase 8 — Leaderboards, Scholar Coins, and cosmetic rewards (defer until core works)

These features are deliberately lower priority because they require more moderation, fairness, abuse prevention, and backend design.

#### 8.1 Leaderboards
- Start with opt-in weekly personal or friend/class competition only if identity, privacy, and authorization models support it.
- Prefer weekly XP, improvement, and consistency categories rather than raw lifetime volume alone.
- Provide privacy controls and nickname/display-name support.
- Do not expose student personal information or scores to unauthorized users.
- Define tie-breaking, reset boundaries, abuse prevention, and pagination.
- Avoid presenting leaderboard position as a measure of academic worth.

#### 8.2 Scholar Coins and shop
- Treat coins as a separate cosmetic economy, not a substitute for XP.
- Begin with non-essential profile frames, avatar accessories, and trophy-case cosmetics.
- Define earn/spend ledger, transaction idempotency, balance consistency, and refund/error handling.
- Never allow coin spending to erase academic progress or buy mastery.
- Do not build real-money purchases without a separate product and security review.

#### 8.3 Seasonal events
- Use configurable start/end times and challenge rules.
- Make expired rewards/history understandable.
- Avoid limited-time pressure that penalizes students who cannot study during a particular period.

**Acceptance criteria**
- Privacy, authorization, anti-abuse, and consistency rules are reviewed before launch.
- These features do not block core study activities.
- All balances and rankings are server-authoritative if persistent.

### Phase 9 — Analytics and experiment plan

Measure educational engagement, not just clicks.

Track events using the existing analytics solution, avoiding personally sensitive event payloads:
- `quest_viewed`
- `quest_started`
- `quest_completed`
- `xp_awarded`
- `level_up`
- `achievement_unlocked`
- `study_session_completed`
- `revision_completed`
- `topic_mastery_updated`
- `next_move_clicked`

Use the established analytics naming and privacy conventions if these differ. Avoid sending question text, student answers, or unnecessary personal information to analytics.

Track:
- Daily meaningful study-session completion rate.
- D7 and D30 return rates.
- Daily quest completion rate.
- Study-plan task completion.
- Revisit/correction rate for previously missed questions.
- Topic mastery progress.
- Mock-exam performance trends.

Where feasible, roll out behind a feature flag and compare cohorts. A rise in app opens or time spent is not sufficient evidence of success if learning outcomes do not improve.

## 4. Cross-cutting engineering requirements

### Architecture and data integrity
- Follow the existing repository architecture and conventions.
- Keep business rules out of presentational components.
- Use strict TypeScript types and avoid `any`.
- Validate external/API payloads using existing validation conventions (e.g. Zod if already adopted).
- Keep server authoritative for persistent rewards, streaks, quests, leaderboards, and coin balances wherever the backend supports it.
- Use idempotency keys or unique constraints for all reward-producing operations.
- Make event processing resilient to retries and concurrent requests.
- Use existing API clients, CSRF/session conventions, query hooks, and cache invalidation patterns; do not introduce a conflicting auth mechanism.
- Reuse existing design tokens, components, icons, and toast systems.
- Do not add a new dependency unless necessary; justify any new dependency.
- Ensure feature flags or staged rollout are used if available.

### UX and accessibility
- Mobile-first responsive layout.
- WCAG-aligned contrast and visible focus states.
- Keyboard support and accessible names for interactive controls.
- Text labels for progress indicators.
- Reduced-motion support for animations and confetti.
- Respect the existing light/dark theme.
- Use short, specific, encouraging microcopy.
- Keep animations brief and non-blocking.
- Provide loading, error, empty, and success states.
- Never rely on colour alone to communicate achievement state.

### Performance and resilience
- Avoid expensive client-side recalculation of historical activity on every render.
- Paginate or summarize long histories.
- Use the current query/cache strategy.
- Prevent duplicate submissions and reward requests.
- Handle stale API responses, retry behaviour, and partial failures.
- Keep the core study experience usable when analytics or celebration effects fail.

## 5. Suggested domain contracts (adapt to the actual backend)

Do not create these contracts blindly. First inspect current APIs and align naming, schemas, and ownership.

Potential domain concepts:
- `GamificationProfile`: total XP, level, level title, XP to next level.
- `XpTransaction`: event reference, XP delta, reason, timestamp, idempotency key.
- `AchievementDefinition`: stable ID, title, description, category, icon, criteria version.
- `UserAchievement`: achievement ID, earned timestamp, progress snapshot.
- `DailyQuest`: stable ID, date/timezone, mission type, target, progress, reward, state.
- `WeeklyChallenge`: stable ID, start/end, rules, reward, state.
- `StudyDay`: date, qualifying activity summary.
- `TopicMastery`: topic ID, status, evidence summary, last assessed timestamp.
- `NextMoveRecommendation`: reason, destination, estimated duration if available.

Prefer extending current backend types and API endpoints rather than introducing duplicate records. Do not store computed values redundantly unless there is a clear consistency strategy.

## 6. Test plan

At minimum, add tests for:

### Unit tests
- XP eligibility and amount.
- Idempotent event processing.
- Level threshold boundaries.
- Daily quest assignment stability.
- Quest completion and bonus awarding.
- Streak day boundaries and timezone handling.
- Achievement criteria and preserving earned history.
- Mastery evidence thresholds.
- Improvement comparisons and insufficient sample sizes.
- Recommendation selection and safe fallback.

### Integration tests
- A learning activity creates the expected reward exactly once.
- Reloading or using a second device preserves XP, quest progress, streaks, and achievements.
- Quest CTA opens the intended activity.
- Existing achievement progress remains correct.
- API failures do not create optimistic false rewards.
- Authorization prevents cross-student access to gamification data.

### UI / end-to-end tests
- New user with no history.
- Returning user with partial progress.
- Student completing a quest.
- Student earning a badge and levelling up.
- Missed streak and supportive return.
- Small mobile viewport and keyboard-only navigation.
- Reduced-motion mode.
- Light/dark theme if supported.
- Loading, empty, offline, and error states.

Run the repository's existing typecheck, lint, unit, and build scripts. Fix introduced failures; report unrelated pre-existing failures separately rather than masking them.

## 7. Suggested implementation checklist

### Before coding
- [ ] Read repository instructions and package scripts.
- [ ] Map routes, APIs, activity events, and existing achievement logic.
- [ ] Identify server-authoritative versus client-only data.
- [ ] Present a concise implementation plan and backend gaps.

### Core foundation
- [ ] Define typed event/reward rules.
- [ ] Implement or integrate idempotent XP ledger.
- [ ] Implement level calculation and tests.
- [ ] Integrate XP/level summary into the current UI.

### Engagement
- [ ] Add stable daily quests.
- [ ] Connect quests to actual activities.
- [ ] Add weekly challenge framework.
- [ ] Improve streak calendar and recovery messaging.
- [ ] Enhance achievement cards and unlock feedback.

### Learning progression
- [ ] Add mastery journeys using real syllabus data.
- [ ] Add comeback/improvement achievements.
- [ ] Add personalized “Your Next Move” card.

### Later features
- [ ] Review privacy and abuse risks.
- [ ] Add opt-in leaderboards if approved.
- [ ] Add cosmetic currency/rewards if approved.
- [ ] Add configurable seasonal events.

### Verification and rollout
- [ ] Add unit, integration, and UI tests.
- [ ] Validate mobile, accessibility, reduced motion, and themes.
- [ ] Verify existing achievement history and counters.
- [ ] Add analytics and success metrics.
- [ ] Use feature flags/staged rollout where available.
- [ ] Document new APIs, rules, assumptions, and operational considerations.

## 8. Instructions to the AI coding agent

Follow these instructions strictly:

1. **Inspect first; do not immediately start editing.** Read project instructions, routes, API clients, types, state/query setup, and existing gamification implementation.
2. Report a concise codebase map, implementation sequence, and any backend dependencies before major changes.
3. Implement one phase at a time, starting with Phase 0 and then Phase 1. Do not try to ship every phase in a single large patch.
4. Use the project's established framework, UI library, API conventions, and design tokens. Avoid unnecessary visual redesigns.
5. Do not use `any`; keep TypeScript strict and code production-ready.
6. Do not hardcode user progress or fabricate API responses in production.
7. Do not award XP or claim success before authoritative confirmation when the backend owns the result.
8. Preserve existing earned achievements and current application behaviour.
9. Add tests with each phase and run relevant checks before continuing.
10. If backend support is missing, specify the exact contract/schema/endpoint needed and separate frontend work from unimplemented backend work. Do not silently substitute local storage for persistent server data.
11. Keep changes scoped, reviewable, and reversible. Summarize changed files, behaviour, tests, assumptions, and remaining gaps after each phase.
12. Pause for clarification only when a decision materially affects product behaviour, data integrity, privacy, cost, or backend architecture. Otherwise make a conservative choice and document it.

## 9. Definition of done

A phase is complete only when:
- It uses real application data or clearly documented API contracts.
- Its business rules are centralized and tested.
- It is responsive and accessible.
- Errors and empty states are handled.
- Existing learning and achievement flows still work.
- Relevant typecheck, lint, tests, and build checks pass, or pre-existing failures are explicitly documented.
- The agent provides a concise implementation report and identifies the next phase.

**Final product outcome:** ScholarsCrib should feel like a motivating study companion that celebrates consistency and real improvement while keeping exam preparation, mastery, and student wellbeing at the centre.
