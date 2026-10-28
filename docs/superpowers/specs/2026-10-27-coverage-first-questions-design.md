# Coverage-first question source: design

Date: 2026-10-27. Backend: `scholarscrib-backend`.

## Goal

Every student-facing flow except past-paper practice and JAMB CBT reads
`CoverageQuestion` (processed, formatted, topic-linked) first, and falls back to
raw `Question` rows only when coverage cannot supply enough. The raw table stays
the staging area and the provider-backed bank.

## Current behaviour

- Mock exams already sit coverage questions (`assessments/coverage_paper.py`,
  `GenerateScopedMockService`).
- Quizzes, pretests, the practice-exit quiz and the lesson quick-quiz read raw
  `Question` rows, via `_pick` / `_pick_prefer_unseen` (`assessments/service.py`),
  `practice_exit.py:189`, and `TopicQuizQuestionsService`
  (`provider/service.py`, provider-backed).
- `RecordTopicAnswersService` (`learning/service.py`) validates submitted IDs
  against `Question` rows of the topic.
- `GetQuestionExplanationService` resolves raw IDs and may buy an explanation
  from the provider.
- Raw rows are ~98% topic-less, so their answers never reach mastery or the
  prediction log. Coverage rows carry a topic from import.

## Out of scope (unchanged)

Past-paper practice (`assessments/past_paper.py`), JAMB CBT
(`assessments/jamb.py`), past-paper counts in `catalogue.py` (~line 156), admin
tools, the mock flow, populating coverage, promoting raw rows to coverage, and
turning on automatic topic matching.

## Design

**1. One picker.** New module `app/services/question_source.py` with
`pick_questions(session, *, subject_id, count, topic_ids, exam_type, exam_year,
difficulty, exclude, prefer_unseen_for)` returning paper-shaped objects.
It asks coverage first, then fills any shortfall from raw `Question`. Coverage
rows are wrapped with `as_paper_question` (`is_coverage=True`); raw rows keep
their existing shape. Order: coverage rows first, then raw.
`CoverageQuestionsRepository` gains `pick_for_topics` (subject, topic ids, exam
type/year, difficulty, exclude) and `many_by_ids`.

**2. Flows switched to the picker:** `_pick` / `_pick_prefer_unseen` (quizzes and
tests), the pretest `_select_questions`, `practice_exit.py`, and
`TopicQuizQuestionsService`. Assessment links and responses already store
`coverage_question_id`, so storage is unchanged.

**3. Mixed-ID resolution.**
- `RecordTopicAnswersService` resolves each submitted ID in coverage, then raw,
  and grades from whichever has it (topic must match). Question ids are random
  strings in both tables, so lookups are unambiguous in practice.
- `GetQuestionExplanationService` checks coverage first and returns its
  `detailedExplanation` / `explanation`; only raw questions may reach the
  provider.

**4. Availability counts** (`catalogue.py` subject/topic counts, `pages.py`
attempted count, `GetBoardReadinessService`) include coverage rows in addition
to raw, so the UI does not report no questions while coverage has some.

**5. Observability.** When the picker falls back to raw, log one structured line
with flow name, requested count, coverage supplied, raw supplied. This shows how
much coverage is still missing.

**6. Effect on evidence.** Answers to coverage questions carry a topic, so they
count toward mastery and are logged for calibration. Raw fallback answers stay
topic-less as today.

## Testing

- Picker: coverage-only, raw-only, mixed, shortfall top-up, exclude and
  prefer-unseen across both tables, empty both.
- A quiz built from coverage grades and shows results correctly.
- `RecordTopicAnswersService` with coverage IDs, raw IDs, and a mix; wrong-topic
  IDs ignored.
- Explanation endpoint for a coverage ID (no provider call) and a raw ID.
- Counts include coverage.
- Past papers and CBT still read only their existing sources.
