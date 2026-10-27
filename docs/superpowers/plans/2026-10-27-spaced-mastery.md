# Spaced Mastery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A topic is MASTERED only when its evidence spans at least two different Lagos calendar days.

**Architecture:** `TopicAggregate` counts distinct evidence days incrementally (`evidence_days`, `last_evidence_day`) while folding events in `seq` order. `is_mastered` gains one clause. Both fields persist on `TopicMastery`. Bumping `SCORING_VERSION` to 4 makes every aggregate refold from its events, so counts rebuild with no backfill.

**Tech Stack:** Python 3.12, SQLAlchemy 2 async, Alembic, pytest (asyncio_mode auto), ruff (88 cols). All paths below are in `scholarscrib-backend`.

**Spec:** `scholarscrib-frontend/docs/superpowers/specs/2026-10-27-spaced-mastery-design.md`

## Global Constraints

- Lagos day via `app.core.timeutil.lagos_day_key` (returns `YYYY-MM-DD`).
- `MASTERY_MIN_DAYS = 2`, in `app/services/learning/evidence.py` beside `MASTERY_MIN_QUESTIONS`.
- `SCORING_VERSION` goes 3 -> 4; update the module docstring too.
- The 0-100 mastery score, retention and confidence do not change.
- New Alembic revision `b3f9d2a6c841`, `down_revision = "a7d3c1e94b52"`, lines <= 88 chars.
- Do not push. Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Days are Lagos days, not UTC days: 22:30 UTC and 23:30 UTC (23:30 and 00:30 Lagos) are two days; 10:00 UTC and 20:00 UTC the same day.
- Events with no score (lesson block, `score is None`), `QUIZ_ABANDONED` and `PRETEST_PASSED` add no day.
- A wrong answer is still evidence and counts as a day.
- A v3 aggregate refolds and ends with `evidence_days` rebuilt, not left at its default.
- Existing tests that build `TopicState(mastery=95, observations=40)` and expect "mastered" now need `evidence_days`.
- A migration head test: the chain stays a single head.

---

### Task 1: Day tracking and the mastery rule

**Files:**
- Modify: `app/services/learning/evidence.py` (constants, docstring)
- Modify: `app/services/learning/mastery.py`
- Modify: `tests/test_planner_baseline.py` (lines ~235 and ~345)
- Create: `tests/test_spaced_mastery.py`

**Interfaces:**
- Produces: `MASTERY_MIN_DAYS`; `TopicAggregate.evidence_days: int`, `TopicAggregate.last_evidence_day: str | None`; `TopicState.evidence_days: int`; `is_mastered` requires `evidence_days >= MASTERY_MIN_DAYS`.

- [ ] **Step 1: Write the failing tests** in `tests/test_spaced_mastery.py`

```python
from datetime import UTC, datetime, timedelta

from app.services.learning.evidence import MASTERY_MIN_DAYS, SCORING_VERSION
from app.services.learning.mastery import (
    LearningEventView,
    TopicAggregate,
    TopicState,
    fold_events,
    graph_colour,
    is_mastered,
    state_from_aggregate,
)

NOW = datetime(2026, 10, 27, 12, tzinfo=UTC)


def answer(seq, when, correct=True, kind="QUESTION_ANSWERED", score=None):
    return LearningEventView(
        seq=seq,
        topic_id="t",
        kind=kind,
        correct=correct,
        score=score,
        difficulty="INTERMEDIATE",
        occurred_at=when,
    )


def fresh():
    return TopicAggregate(student_id="s", topic_id="t")


def many(when_list):
    return [answer(i + 1, when) for i, when in enumerate(when_list)]


def test_constant_is_two():
    assert MASTERY_MIN_DAYS == 2


def test_seven_strong_answers_on_one_day_are_not_mastered():
    when = NOW - timedelta(hours=1)
    aggregate = fold_events(fresh(), many([when] * 12), NOW)
    state = state_from_aggregate(aggregate, NOW)
    assert state.evidence_days == 1
    assert state.mastery >= 70 and state.observations >= 7
    assert not is_mastered(state)
    assert graph_colour(state) == "STARTED"


def test_the_same_answers_across_two_days_are_mastered():
    day1 = NOW - timedelta(days=1)
    day2 = NOW - timedelta(hours=1)
    aggregate = fold_events(fresh(), many([day1] * 6 + [day2] * 6), NOW)
    state = state_from_aggregate(aggregate, NOW)
    assert state.evidence_days == 2
    assert is_mastered(state)


def test_the_boundary_is_the_lagos_midnight_not_utc():
    # Lagos is UTC+1. 22:30 UTC and 23:30 UTC are 23:30 and 00:30 Lagos.
    a = datetime(2026, 10, 25, 22, 30, tzinfo=UTC)
    b = datetime(2026, 10, 25, 23, 30, tzinfo=UTC)
    aggregate = fold_events(fresh(), many([a, b]), NOW)
    assert aggregate.evidence_days == 2
    # 10:00 UTC and 20:00 UTC are the same Lagos day.
    c = datetime(2026, 10, 24, 10, tzinfo=UTC)
    d = datetime(2026, 10, 24, 20, tzinfo=UTC)
    aggregate = fold_events(fresh(), many([c, d]), NOW)
    assert aggregate.evidence_days == 1


def test_a_wrong_answer_still_counts_as_a_day():
    aggregate = fold_events(
        fresh(), [answer(1, NOW - timedelta(days=2), correct=False)], NOW
    )
    assert aggregate.evidence_days == 1


def test_unscored_lesson_abandoned_and_pretest_events_add_no_day():
    when = NOW - timedelta(days=1)
    events = [
        answer(1, when, kind="LESSON_BLOCK_COMPLETED", score=None),
        answer(2, when, kind="QUIZ_ABANDONED"),
        answer(3, when, kind="PRETEST_PASSED"),
    ]
    aggregate = fold_events(fresh(), events, NOW)
    assert aggregate.evidence_days == 0


def test_a_scored_lesson_event_counts_as_a_day():
    when = NOW - timedelta(days=1)
    events = [answer(1, when, kind="LESSON_COMPLETED", score=0.9)]
    assert fold_events(fresh(), events, NOW).evidence_days == 1


def test_a_stale_version_refolds_and_rebuilds_the_day_count():
    aggregate = fresh()
    aggregate.scoring_version = SCORING_VERSION - 1
    aggregate.evidence_days = 9
    aggregate.last_evidence_day = "2000-01-01"
    events = many([NOW - timedelta(days=3), NOW - timedelta(days=1)])
    fold_events(aggregate, events, NOW)
    assert aggregate.scoring_version == SCORING_VERSION
    assert aggregate.evidence_days == 2


def test_a_bare_topic_state_has_no_days():
    assert TopicState(topic_id="t").evidence_days == 0
```

- [ ] **Step 2: Run to confirm failure**

Run: `.venv/Scripts/python -m pytest tests/test_spaced_mastery.py -q`
Expected: FAIL (ImportError on `MASTERY_MIN_DAYS`).

- [ ] **Step 3: Implement**

In `evidence.py`: change line 1 docstring to `SCORING_VERSION 4`, set `SCORING_VERSION = 4`, and add `MASTERY_MIN_DAYS = 2` under `MASTERY_MIN_QUESTIONS = 7`.

In `mastery.py`:
- import `MASTERY_MIN_DAYS` (alphabetical, after `GAP_RETENTION`) and `from app.core.timeutil import as_utc, lagos_day_key`.
- `TopicAggregate`: add after `last_effort_at`:
  ```python
  evidence_days: int = 0
  last_evidence_day: str | None = None
  ```
- In `apply_event`, after the `QUESTION_ANSWERED` / lesson `elif` / `else: return` chain and before the `if kind in EFFORT_KINDS` block, add:
  ```python
  day = lagos_day_key(occurred)
  if day != aggregate.last_evidence_day:
      aggregate.evidence_days += 1
      aggregate.last_evidence_day = day
  ```
  The unscored-lesson path already `return`s earlier, and abandoned/pretest return first, so only real evidence reaches this point.
- `fold_events` reset block: add `aggregate.evidence_days = 0` and `aggregate.last_evidence_day = None`.
- `TopicState`: add `evidence_days: int = 0` after `score`; in `state_from_aggregate` pass `evidence_days=aggregate.evidence_days`.
- `is_mastered`: 
  ```python
  return (
      state.mastery >= TARGET
      and state.observations >= MASTERY_MIN_QUESTIONS
      and state.evidence_days >= MASTERY_MIN_DAYS
  )
  ```
  and update its docstring: "A high score alone is not mastery: it must rest on enough answers, from at least two different days."

- [ ] **Step 4: Fix the two planner tests** in `tests/test_planner_baseline.py`: change both `TopicState("m1", mastery=95, observations=40)` (lines ~235 and ~345) to `TopicState("m1", mastery=95, observations=40, evidence_days=3)`.

- [ ] **Step 5: Run the full suite**

Run: `.venv/Scripts/python -m pytest -q`
Expected: all pass. If any other test fails because it expected instant mastery, give its `TopicState` `evidence_days=3` (do not weaken the rule). Then `.venv/Scripts/python -m ruff check . && .venv/Scripts/python -m ruff format --check .`

- [ ] **Step 6: Commit**

```bash
git add app/services/learning/evidence.py app/services/learning/mastery.py tests/test_spaced_mastery.py tests/test_planner_baseline.py
git commit -m "feat: require evidence on two days before a topic is mastered" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Persist the day fields

**Files:**
- Modify: `app/database/models/learning.py` (`TopicMastery`)
- Modify: `app/services/learning/mastery_store.py` (`_persist`, `_aggregate`)
- Create: `alembic/versions/b3f9d2a6c841_add_topic_mastery_evidence_days.py`
- Modify: `tests/test_spaced_mastery.py` (append)

**Interfaces:**
- Consumes: `TopicAggregate.evidence_days`, `.last_evidence_day` from Task 1.
- Produces: columns `TopicMastery.evidenceDays` (int, not null, default 0), `TopicMastery.lastEvidenceDay` (string, nullable).

- [ ] **Step 1: Append failing tests** to `tests/test_spaced_mastery.py`

```python
from app.database.models import TopicMastery
from app.services.learning.mastery_store import _aggregate


def test_aggregate_reads_the_stored_day_fields():
    row = TopicMastery(
        student_id="s",
        topic_id="t",
        evidence_days=3,
        last_evidence_day="2026-10-26",
    )
    # unset numeric columns have no Python default until flushed
    for name in (
        "acc_outcome", "acc_mass", "acc_observations", "lesson_outcome",
        "lesson_mass", "lesson_observations", "srs_outcome", "srs_mass",
        "srs_observations", "abandon_count", "cursor_seq", "scoring_version",
    ):
        setattr(row, name, 0)
    aggregate = _aggregate("s", row)
    assert aggregate.evidence_days == 3
    assert aggregate.last_evidence_day == "2026-10-26"
```

(Tidy the import to the top of the file and wrap the tuple per ruff format.)

- [ ] **Step 2: Run to confirm failure** — `pytest tests/test_spaced_mastery.py -q`, expect TypeError on `evidence_days`.

- [ ] **Step 3: Implement**
- Model, after `last_effort_at`:
  ```python
  evidence_days: Mapped[int] = mapped_column(
      "evidenceDays", Integer, default=0, server_default="0"
  )
  last_evidence_day: Mapped[str | None] = mapped_column("lastEvidenceDay", String)
  ```
  (`String` is already imported in this module.)
- `_persist`: add `row.evidence_days = aggregate.evidence_days` and `row.last_evidence_day = aggregate.last_evidence_day` beside `row.last_effort_at`.
- `_aggregate`: pass `evidence_days=row.evidence_days, last_evidence_day=row.last_evidence_day`.
- Migration:
  ```python
  """Add evidence-day tracking to TopicMastery

  Revision ID: b3f9d2a6c841
  Revises: a7d3c1e94b52
  Create Date: 2026-10-27 14:00:00.000000

  """

  import sqlalchemy as sa

  from alembic import op

  revision = "b3f9d2a6c841"
  down_revision = "a7d3c1e94b52"
  branch_labels = None
  depends_on = None


  def upgrade() -> None:
      op.add_column(
          "TopicMastery",
          sa.Column("evidenceDays", sa.Integer(), server_default="0", nullable=False),
      )
      op.add_column(
          "TopicMastery", sa.Column("lastEvidenceDay", sa.String(), nullable=True)
      )


  def downgrade() -> None:
      op.drop_column("TopicMastery", "lastEvidenceDay")
      op.drop_column("TopicMastery", "evidenceDays")
  ```

- [ ] **Step 4: Verify**

Run: `.venv/Scripts/python -m pytest -q` (all pass, including the single-head test in `tests/test_planner_timetable.py`), `.venv/Scripts/python -m alembic heads` (exactly `b3f9d2a6c841`), then ruff check and format check.

- [ ] **Step 5: Commit**

```bash
git add app/database/models/learning.py app/services/learning/mastery_store.py alembic/versions/b3f9d2a6c841_add_topic_mastery_evidence_days.py tests/test_spaced_mastery.py
git commit -m "feat: persist evidence-day tracking on TopicMastery" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Deployment note (not a task): the user applies the migration (`alembic upgrade head`) before running the new code, otherwise `_persist` fails (it is wrapped, so it logs and continues, but days will not persist). On first load after deploy every aggregate refolds because of the version bump; `GetCalibrationReport` rows from before are tagged version 3 and stay filterable by `scoringVersion`.
