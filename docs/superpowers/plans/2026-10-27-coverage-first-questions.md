# Coverage-First Question Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quizzes, pretests, the practice-exit quiz and the lesson quick-quiz draw from `CoverageQuestion` first and top up from raw `Question` rows; lesson-check grading, explanations and availability counts understand both.

**Architecture:** One new module, `app/services/question_source.py`, owns "where do practice questions come from". `assessments/service.py::_pick` and `TopicQuizQuestionsService` call it, so every flow that goes through `_pick` / `_pick_prefer_unseen` (quizzes, pretest, practice exit) switches at one seam. Coverage rows are exposed in the existing paper-question shape (`as_paper_question`, `is_coverage=True`), so persistence, grading and results code is unchanged. Past papers and JAMB CBT never touch the new module.

**Tech Stack:** Python 3.12, SQLAlchemy 2 async, FastAPI, pytest (asyncio_mode auto), ruff (88 cols). All paths are in `scholarscrib-backend`. Tests in this repo monkeypatch repositories (no DB); follow that style.

**Spec:** `scholarscrib-frontend/docs/superpowers/specs/2026-10-27-coverage-first-questions-design.md`

## Global Constraints

- Coverage first, raw `Question` fills only the shortfall. When `class_levels` is passed, skip coverage (its picker has no class-level support) and use raw only.
- Past-paper practice (`assessments/past_paper.py`), JAMB CBT (`assessments/jamb.py`), the mock flow (`GenerateScopedMockService`) and `catalogue.py` past-paper counts (`past_paper_groups`) are NOT changed.
- **Import cycle:** `app/services/assessments/__init__.py` pulls in `service.py`, which will import `question_source`. So `question_source.py` must import `as_paper_question` function-locally (inside `pick_questions`), never at module top.
- Log one `logger.info` line per pick: flow, requested, coverage supplied, raw supplied.
- Work on branch `feat/coverage-first-questions` off `main`. Do not push. Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Existing tests that monkeypatch `questions_repository.pick_objective` / `many` will now also hit the coverage repository. Patch `coverage_questions_repository.pick_for_topics` (return `[]`) / `by_ids` in those tests; never weaken assertions.

## Review Focus

- A topic with 2 coverage questions and a request for 5 returns 2 coverage + 3 raw, and the raw call excludes the 2 coverage ids.
- Zero coverage rows -> behaviour identical to today (raw only).
- `exclude` / "seen" works across both tables: a completed coverage question must count as seen (`seen_question_ids` currently reads only `question_id`).
- A lesson-check answer for a coverage id is graded and recorded; an id belonging to another topic is ignored in both tables.
- The explanation endpoint for a coverage id never calls the provider; a coverage row with no explanation gives the existing 404 message, not a provider purchase.
- `public_question(...)` works for a coverage-wrapped row (used by the topic quiz).

---

### Task 1: Coverage picker, repository methods, seen ids

**Files:**
- Modify: `app/database/repositories/coverage.py`
- Modify: `app/database/repositories/assessment.py` (`seen_question_ids`, ~line 269)
- Create: `app/services/question_source.py`
- Create: `tests/test_question_source.py`

**Interfaces:**
- Produces:
  - `coverage_questions_repository.pick_for_topics(session, *, subject_id, count, topic_ids=None, exam_type=None, exam_year=None, difficulty=None, exclude=None) -> list[CoverageQuestion]`
  - `coverage_questions_repository.count_for_subject(session, subject_id) -> int`, `.count_for_topic(session, topic_id) -> int`, `.board_subject_counts(session, exam_type) -> list[tuple[str, int]]`
  - `question_source.pick_questions(session, *, subject_id, count, topic_ids=None, exam_type=None, exam_year=None, difficulty=None, exclude=None, class_levels=None, flow="unspecified") -> list` (paper-shaped coverage objects first, then raw `Question` rows)
  - `question_source.questions_by_id(session, ids, topic_id) -> dict[str, object]` (coverage rows and raw rows of the topic, keyed by id)

- [ ] **Step 1: Write the failing tests** in `tests/test_question_source.py`

```python
from types import SimpleNamespace

import pytest

from app.services import question_source


def cov(question_id, topic_id="t1"):
    return SimpleNamespace(
        id=question_id,
        subject_id="s1",
        topic_id=topic_id,
        exam_type="WAEC",
        exam_year=None,
        question_number=None,
        question_text="Q",
        question_image=None,
        question_type="OBJECTIVE",
        options={"A": "1"},
        correct_answer="A",
        explanation=None,
        solution_image=None,
        difficulty="BASIC",
        marks=1,
    )


def raw(question_id):
    return SimpleNamespace(id=question_id, topic_id="t1", difficulty="BASIC")


class Calls:
    def __init__(self, coverage, raw_rows):
        self.coverage = coverage
        self.raw_rows = raw_rows
        self.coverage_args = None
        self.raw_args = None


@pytest.fixture
def calls(monkeypatch):
    holder = Calls([], [])

    async def fake_coverage(session, **kwargs):
        holder.coverage_args = kwargs
        return holder.coverage

    async def fake_raw(session, **kwargs):
        holder.raw_args = kwargs
        return holder.raw_rows

    monkeypatch.setattr(
        question_source.coverage_questions_repository, "pick_for_topics", fake_coverage
    )
    monkeypatch.setattr(
        question_source.questions_repository, "pick_objective", fake_raw
    )
    return holder


async def test_coverage_alone_fills_the_request_and_raw_is_not_asked(calls):
    calls.coverage = [cov("c1"), cov("c2")]
    picked = await question_source.pick_questions(
        object(), subject_id="s1", count=2, topic_ids=["t1"]
    )
    assert [item.id for item in picked] == ["c1", "c2"]
    assert all(item.is_coverage for item in picked)
    assert calls.raw_args is None


async def test_raw_tops_up_the_shortfall_and_excludes_coverage_ids(calls):
    calls.coverage = [cov("c1"), cov("c2")]
    calls.raw_rows = [raw("r1"), raw("r2"), raw("r3")]
    picked = await question_source.pick_questions(
        object(), subject_id="s1", count=5, topic_ids=["t1"], exclude={"seen"}
    )
    assert [item.id for item in picked] == ["c1", "c2", "r1", "r2", "r3"]
    assert calls.raw_args["count"] == 3
    assert calls.raw_args["exclude"] == {"seen", "c1", "c2"}
    assert calls.coverage_args["exclude"] == {"seen"}


async def test_no_coverage_behaves_like_raw_only(calls):
    calls.raw_rows = [raw("r1")]
    picked = await question_source.pick_questions(
        object(), subject_id="s1", count=1, topic_ids=["t1"]
    )
    assert [item.id for item in picked] == ["r1"]
    assert calls.raw_args["count"] == 1


async def test_class_levels_skip_coverage(calls):
    calls.coverage = [cov("c1")]
    calls.raw_rows = [raw("r1")]
    picked = await question_source.pick_questions(
        object(), subject_id="s1", count=1, class_levels=[("SS1", "FIRST")]
    )
    assert [item.id for item in picked] == ["r1"]
    assert calls.coverage_args is None
    assert calls.raw_args["class_levels"] == [("SS1", "FIRST")]


async def test_questions_by_id_keeps_only_the_topics_rows_from_both_tables(
    monkeypatch,
):
    async def fake_by_ids(session, ids):
        return [cov("c1", "t1"), cov("c2", "other")]

    async def fake_many(session, statement):
        return [raw("r1")]

    monkeypatch.setattr(
        question_source.coverage_questions_repository, "by_ids", fake_by_ids
    )
    monkeypatch.setattr(question_source.questions_repository, "many", fake_many)
    found = await question_source.questions_by_id(
        object(), ["c1", "c2", "r1", "missing"], "t1"
    )
    assert set(found) == {"c1", "r1"}


def test_seen_ids_query_covers_both_question_columns():
    from datetime import UTC, datetime

    from app.database.repositories.assessment import seen_question_ids_statement

    sql = str(seen_question_ids_statement("student", datetime(2026, 1, 1, tzinfo=UTC)))
    assert "coverageQuestionId" in sql and "questionId" in sql
```

- [ ] **Step 2: Run to confirm failure**

Run: `.venv/Scripts/python -m pytest tests/test_question_source.py -q`
Expected: FAIL (ModuleNotFoundError: `app.services.question_source`).

- [ ] **Step 3: Implement**

`app/database/repositories/coverage.py` (inside `CoverageQuestionRepository`):
```python
    async def pick_for_topics(
        self,
        session: AsyncSession,
        *,
        subject_id: str,
        count: int,
        topic_ids: list[str] | None = None,
        exam_type: str | None = None,
        exam_year: int | None = None,
        difficulty: str | None = None,
        exclude: set[str] | None = None,
    ) -> list[CoverageQuestion]:
        """Random objective coverage questions, optionally within given topics."""
        if count <= 0:
            return []
        statement = select(CoverageQuestion).where(
            CoverageQuestion.subject_id == subject_id,
            CoverageQuestion.question_type == "OBJECTIVE",
        )
        if topic_ids:
            statement = statement.where(CoverageQuestion.topic_id.in_(topic_ids))
        if exam_type:
            statement = statement.where(CoverageQuestion.exam_type == exam_type)
        if exam_year:
            statement = statement.where(CoverageQuestion.exam_year == exam_year)
        if difficulty:
            statement = statement.where(CoverageQuestion.difficulty == difficulty)
        if exclude:
            statement = statement.where(CoverageQuestion.id.notin_(exclude))
        return await self.many(session, statement.order_by(func.random()).limit(count))

    async def count_for_subject(self, session: AsyncSession, subject_id: str) -> int:
        return await self.count(session, CoverageQuestion.subject_id == subject_id)

    async def count_for_topic(self, session: AsyncSession, topic_id: str) -> int:
        return await self.count(session, CoverageQuestion.topic_id == topic_id)

    async def board_subject_counts(self, session: AsyncSession, exam_type: str) -> list:
        return list(
            (
                await self.rows(
                    session,
                    select(CoverageQuestion.subject_id, func.count())
                    .where(
                        CoverageQuestion.exam_type == exam_type,
                        CoverageQuestion.topic_id.is_not(None),
                        CoverageQuestion.question_type == "OBJECTIVE",
                    )
                    .group_by(CoverageQuestion.subject_id),
                )
            ).all()
        )
```
(Confirm `BaseRepository` has `count(session, *conditions)` and `rows(session, statement)` — `question.py` uses both the same way.)

`app/database/repositories/assessment.py`: replace `seen_question_ids` with a module-level statement builder plus the method using it:
```python
def seen_question_ids_statement(student_id: str, since):
    return (
        select(
            func.coalesce(
                QuestionResponse.question_id, QuestionResponse.coverage_question_id
            )
        )
        .join(AssessmentAttempt, AssessmentAttempt.id == QuestionResponse.attempt_id)
        .where(
            func.coalesce(
                QuestionResponse.question_id, QuestionResponse.coverage_question_id
            ).is_not(None),
            AssessmentAttempt.student_id == student_id,
            AssessmentAttempt.status == "COMPLETED",
            AssessmentAttempt.completed_at >= since,
        )
    )
```
and in the repository: `rows = await self.rows(session, seen_question_ids_statement(student_id, since)); return {row[0] for row in rows.all()}`. Ensure `func` is imported there.

`app/services/question_source.py`:
```python
"""Where a student's practice questions come from.

Coverage questions (processed, formatted, topic-linked) come first; raw bank
questions only fill a shortfall. Past-paper practice and JAMB CBT do not use
this module: they read provider questions directly.
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import Question
from app.database.repositories.coverage import coverage_questions_repository
from app.database.repositories.question import questions_repository

logger = logging.getLogger(__name__)


async def pick_questions(
    session: AsyncSession,
    *,
    subject_id: str,
    count: int,
    topic_ids: list[str] | None = None,
    exam_type: str | None = None,
    exam_year: int | None = None,
    difficulty: str | None = None,
    exclude: set[str] | None = None,
    class_levels: list[tuple[str, str]] | None = None,
    flow: str = "unspecified",
) -> list:
    # Function-local: the assessments package imports this module's callers.
    from app.services.assessments.coverage_paper import as_paper_question

    taken = set(exclude or ())
    covered: list = []
    if not class_levels:
        rows = await coverage_questions_repository.pick_for_topics(
            session,
            subject_id=subject_id,
            count=count,
            topic_ids=topic_ids,
            exam_type=exam_type,
            exam_year=exam_year,
            difficulty=difficulty,
            exclude=set(taken) or None,
        )
        covered = [as_paper_question(row) for row in rows]
    taken.update(item.id for item in covered)
    shortfall = count - len(covered)
    filler: list = []
    if shortfall > 0:
        filler = await questions_repository.pick_objective(
            session,
            subject_id=subject_id,
            count=shortfall,
            topic_ids=topic_ids,
            exam_type=exam_type,
            exam_year=exam_year,
            difficulty=difficulty,
            exclude=taken or None,
            class_levels=class_levels,
        )
    logger.info(
        "question_source flow=%s requested=%s coverage=%s raw=%s",
        flow,
        count,
        len(covered),
        len(filler),
    )
    return [*covered, *filler]


async def questions_by_id(
    session: AsyncSession, ids: list[str], topic_id: str
) -> dict[str, object]:
    """Coverage and raw questions of one topic, keyed by id."""
    wanted = list(dict.fromkeys(ids))
    found: dict[str, object] = {
        row.id: row
        for row in await coverage_questions_repository.by_ids(session, wanted)
        if row.topic_id == topic_id
    }
    rest = [item for item in wanted if item not in found]
    if rest:
        for row in await questions_repository.many(
            session,
            select(Question).where(Question.id.in_(rest), Question.topic_id == topic_id),
        ):
            found[row.id] = row
    return found
```
Note the `by_ids` call returns ids it finds across topics; ids for another topic are dropped (and also not looked up in raw if present in coverage — acceptable, ids are unique).

- [ ] **Step 4: Run** `.venv/Scripts/python -m pytest tests/test_question_source.py -q` (pass), then full suite, `ruff check .`, `ruff format --check .`.

- [ ] **Step 5: Commit**

```bash
git add app/database/repositories/coverage.py app/database/repositories/assessment.py app/services/question_source.py tests/test_question_source.py
git commit -m "feat: add a coverage-first question picker" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Switch quizzes, pretest, practice exit and the topic quiz

**Files:**
- Modify: `app/services/assessments/service.py` (`_pick` ~line 82; pretest `_select_questions` ~line 1009)
- Modify: `app/services/practice_exit.py` (~line 189)
- Modify: `app/services/provider/service.py` (`TopicQuizQuestionsService._for_exam`, ~line 725)
- Modify/Test: existing tests that patch the raw pickers; add cases to `tests/test_topic_quiz.py` and `tests/test_practice_exit.py`

**Interfaces:**
- Consumes: `question_source.pick_questions` (Task 1).
- Produces: `_pick(..., flow: str = "quiz")` now delegates to `pick_questions`.

- [ ] **Step 1: Write failing tests.** In `tests/test_topic_quiz.py`, add a test that, with `question_source.coverage_questions_repository.pick_for_topics` patched to return one coverage-shaped row and `questions_repository.pick_objective` patched to return `[]`, `TopicQuizQuestionsService(...)._for_exam(...)` (provider unconfigured) returns that question with `correctAnswer` and `topicId` present. Follow the existing fixture style in that file. In `tests/test_practice_exit.py` (or `tests/test_question_source.py`) add a test that `assessments._pick(...)` returns coverage items when coverage supplies them (patch `question_source.coverage_questions_repository.pick_for_topics` and `questions_repository.pick_objective`).

- [ ] **Step 2: Run** the new tests; expect FAIL.

- [ ] **Step 3: Implement**
  - `assessments/service.py`: replace the body of `_pick` with a call to `question_source.pick_questions(session, subject_id=..., count=..., topic_ids=..., exam_type=..., exam_year=..., difficulty=..., exclude=..., class_levels=..., flow=flow)`; add `flow: str = "quiz"` to its signature and import `from app.services.question_source import pick_questions` (top-level import is fine here: `question_source` imports `as_paper_question` function-locally). Change the return annotation to `list` (items are `Question` or paper-shaped coverage objects). In the pretest `_select_questions`, pass `flow="pretest"` to both `_pick` calls.
  - `practice_exit.py`: pass `flow="practice_exit"` through `_pick_prefer_unseen(..., flow="practice_exit")` (it forwards `**filters` to `_pick`).
  - `provider/service.py`: in `TopicQuizQuestionsService._for_exam`, replace `questions_repository.pick_objective(...)` with `await pick_questions(self.session, subject_id=subject.id, count=self.limit, topic_ids=[topic.id], exam_type=exam_type, flow="topic_quiz")`. `public_question` already works on the coverage-shaped object. Provider top-up code after it is unchanged.
  - Update existing tests that monkeypatch the raw pickers so they also patch `coverage_questions_repository.pick_for_topics` to return `[]`.

- [ ] **Step 4: Run the full suite, ruff check, ruff format --check.** All pass.

- [ ] **Step 5: Commit** `feat: quizzes, pretest, practice exit and topic quiz read coverage first`.

---

### Task 3: Mixed-ID lesson-check grading and explanations

**Files:**
- Modify: `app/services/learning/service.py` (`RecordTopicAnswersService.process`, ~line 439)
- Modify: `app/services/provider/service.py` (`GetQuestionExplanationService.process`, ~line 789)
- Test: `tests/test_topic_answers.py`, new explanation tests (e.g. `tests/test_question_explanation.py`)

**Interfaces:**
- Consumes: `question_source.questions_by_id` (Task 1), `coverage_questions_repository.by_id` (from `BaseRepository`).

- [ ] **Step 1: Write failing tests.**
  - `tests/test_topic_answers.py`: with `questions_by_id` patched to return a coverage row (has `.id`, `.difficulty`, `.correct_answer`), submitting an answer for that id yields a recorded `QUESTION_ANSWERED` event with `source_id` equal to the id and a correct/incorrect result from `selectedAnswer == correct_answer`. Reuse the file's existing patching pattern; the old patch of `questions_repository.many` becomes a patch of `learning.questions_by_id`.
  - Explanation: with `coverage_questions_repository.by_id` patched to return a row having `detailed_explanation="Long"`, `explanation="Short"`, `possible_mistakes=["m"]`, `solution_image=None`, `GetQuestionExplanationService(session, "c1", provider=fake).process()` returns `explanation == "Long"`, `commonMistakes == ["m"]`, `source == "COVERAGE"`, and the fake provider's `explain` is never called. A coverage row with neither explanation field raises `ApiError` 404 "No explanation is available for this question." and does not call the provider.

- [ ] **Step 2: Run; expect FAIL.**

- [ ] **Step 3: Implement.**
  - `learning/service.py`: replace the `bank = {...}` block with `bank = await questions_by_id(self.session, ids, topic.id)`; import `questions_by_id` from `app.services.question_source`. Remove imports that become unused (`select`, `Question`, `questions_repository` — only if unused elsewhere in the file; ruff will tell you).
  - `GetQuestionExplanationService.process`: at the top, `coverage = await coverage_questions_repository.by_id(self.session, self.question_id)`; if found, `text = coverage.detailed_explanation or coverage.explanation`; if empty raise `ApiError(404, "No explanation is available for this question.")`; else return `self._payload(text, source="COVERAGE", mistakes=coverage.possible_mistakes, image_url=coverage.solution_image)`. Otherwise continue with the existing raw/provider logic unchanged. Import `coverage_questions_repository` in that module.

- [ ] **Step 4: Run full suite, ruff.**

- [ ] **Step 5: Commit** `feat: lesson checks and explanations understand coverage questions`.

---

### Task 4: Availability counts include coverage

**Files:**
- Modify: `app/services/catalogue.py` (~lines 54, 137)
- Modify: `app/services/assessments/service.py` (`GetBoardReadinessService`, ~line 822)
- Test: `tests/test_question_source.py` (append) or a new `tests/test_availability_counts.py`

**Interfaces:**
- Consumes: `coverage_questions_repository.count_for_subject/count_for_topic/board_subject_counts` (Task 1).

- [ ] **Step 1: Write failing tests.** Patch both repositories' count methods and assert: the subject listing's `question_count` and the topic summary's `questionCount` are the sum of raw and coverage; `GetBoardReadinessService` merges per-subject counts (a subject with 12 raw + 10 coverage qualifies at the >= 20 threshold, which neither does alone).

- [ ] **Step 2: Run; expect FAIL.**

- [ ] **Step 3: Implement.** In `catalogue.py` add `+ await coverage_questions_repository.count_for_subject(...)` / `count_for_topic(...)` to the two existing counts. Leave `past_paper_groups` untouched. In `GetBoardReadinessService.process`, build `totals: dict[str, int]` summing `questions_repository.board_subject_counts(...)` and `coverage_questions_repository.board_subject_counts(...)` per subject id, then `qualifying = sum(1 for count in totals.values() if count >= 20)`.

- [ ] **Step 4: Run full suite, ruff check, ruff format --check.**

- [ ] **Step 5: Commit** `feat: availability counts include coverage questions`.

Deployment note (not a task): no migration is needed. Until the coverage table is populated, flows fall back to raw questions exactly as today; the `question_source` log lines show how often.
