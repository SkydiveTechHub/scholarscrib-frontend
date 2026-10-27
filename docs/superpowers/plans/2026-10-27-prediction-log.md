# Prediction Log and Calibration Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the mastery engine's prediction before every topic-mapped question answer, and expose an admin report that scores those predictions.

**Architecture:** A new append-only `PredictionLog` table. A small service (`prediction_log.py`) reads each topic's state via the existing `GetTopicMasteryService` just before a submission's `QUESTION_ANSWERED` events are added, and inserts one row per answer. Pure calibration maths (`calibration.py`) feeds an admin endpoint. Nothing student-facing changes and a logging failure never fails a submission.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2 async, Alembic, pytest (`asyncio_mode = "auto"`), Postgres.

**Spec:** `scholarscrib-frontend/docs/superpowers/specs/2026-10-27-prediction-log-design.md`

All paths below are relative to `scholarscrib-backend/` unless stated. Run Python as `.venv/Scripts/python`. The backend is a git repo on `main`; do the work on a branch.

## Global Constraints

- p̂ is the **unrounded composite score** (0-1) from `state_from_aggregate`, not the rounded `mastery` integer.
- Predictions are made from the topic state **before** the submission's own events exist; for a batch attempt every question of one topic uses the same pre-attempt state.
- `PredictionLog` is append-only and is never read by the mastery fold or any student-facing path.
- A failure in `record_predictions` is logged and swallowed; it must never fail the student's submission.
- Rows are written only when the topic is known and the outcome is known (`topic_id` set, `correct` not `None`).
- Sources are exactly `ASSESSMENT` and `LESSON_CHECK`. Pretests are not logged.
- Calibration buckets: 10 bins over p̂, `lowSample` is true when `n < 30`. p̂ is clipped to `[1e-6, 1 - 1e-6]` before log-loss.
- Evidence split uses `CONFIDENCE_FLOOR` (0.35): `confidence < floor` versus `>= floor`.
- Every row carries `scoringVersion = SCORING_VERSION` (currently 3).
- Alembic head before this work is `e2c5b8d1a7f3`; the new migration's `down_revision` is that value.

## Review Focus

- A submission whose answers all lack `topic_id` (unmapped coverage questions): writes no rows and raises nothing. Tested in Task 4.
- Unanswered questions (`selected is None`): the engine stores them as wrong, but a blank is not evidence of what the student knew, so they are not logged. Tested in Task 5.
- Duplicate `questionId` entries in a lesson submission: one prediction row per question, matching the event dedupe. Tested in Task 5.
- A database or mastery-read failure inside `record_predictions`: the submission still succeeds. Tested in Task 4.
- Empty result set or filters that match nothing: HTTP 200 with zeroed fields and ten empty buckets. Tested in Tasks 2 and 6.
- p̂ of exactly 0 or 1: log-loss stays finite, buckets 0 and 9 are used. Tested in Task 2.

## File Structure

| File | Responsibility |
|---|---|
| `app/services/learning/mastery.py` (modify) | Expose the unrounded composite as `TopicState.score` |
| `app/services/learning/calibration.py` (create) | Pure maths: `PredictionRow`, `calibration_report` |
| `app/database/models/learning.py` (modify) | `PredictionLog` model |
| `app/database/models/__init__.py` (modify) | Export `PredictionLog` |
| `alembic/versions/a7d3c1e94b52_add_prediction_log.py` (create) | Table and indexes |
| `app/database/repositories/prediction_log.py` (create) | Insert rows, read rows for the report |
| `app/services/learning/prediction_log.py` (create) | `AnsweredQuestion`, `build_rows`, `record_predictions`, `GetCalibrationReportService` |
| `app/services/assessments/service.py` (modify) | Call `record_predictions` in `_persist_responses` |
| `app/services/learning/service.py` (modify) | Call `record_predictions` in `RecordTopicAnswersService.process` |
| `app/api/responses.py` (modify) | `CalibrationOut` |
| `app/api/admin/calibration.py` (create) | `GET /calibration` |
| `app/api/admin/__init__.py` (modify) | Register the router |
| `tests/test_mastery_score.py`, `tests/test_calibration.py`, `tests/test_prediction_log.py`, `tests/test_prediction_hooks.py`, `tests/test_calibration_endpoint.py` (create) | Tests |

---

### Task 1: Expose the unrounded composite score

**Files:**
- Modify: `app/services/learning/mastery.py` (`TopicState` dataclass, `state_from_aggregate`, import block)
- Test: `tests/test_mastery_score.py`

**Interfaces:**
- Consumes: existing `state_from_aggregate(aggregate, now) -> TopicState`.
- Produces: `TopicState.score: float` in `[0, 1]`, default `PRIOR_OUTCOME` (0.45). Tasks 4 and 5 read it.

- [ ] **Step 1: Write the failing test**

Create `tests/test_mastery_score.py`:

```python
from datetime import UTC, datetime

import pytest

from app.services.learning.evidence import PRIOR_OUTCOME
from app.services.learning.mastery import (
    ChannelAggregate,
    TopicAggregate,
    TopicState,
    state_from_aggregate,
)

NOW = datetime(2026, 10, 27, tzinfo=UTC)


def test_score_is_the_unrounded_composite():
    aggregate = TopicAggregate(
        student_id="s",
        topic_id="t",
        acc=ChannelAggregate(outcome=2.0, mass=2.0, observations=2),
    )
    state = state_from_aggregate(aggregate, NOW)
    # (2 + 4 * 0.45) / (2 + 4) with the lesson channel carrying no weight
    assert state.score == pytest.approx(3.8 / 6)
    assert state.mastery == 63


def test_score_for_a_topic_with_no_evidence_is_the_prior():
    state = state_from_aggregate(TopicAggregate(student_id="s", topic_id="t"), NOW)
    assert state.score == pytest.approx(PRIOR_OUTCOME)


def test_score_default_on_a_bare_topic_state():
    assert TopicState(topic_id="t").score == PRIOR_OUTCOME
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/Scripts/python -m pytest tests/test_mastery_score.py -v`
Expected: FAIL (`AttributeError: ... no attribute 'score'` / unexpected keyword).

- [ ] **Step 3: Implement**

In `app/services/learning/mastery.py`:

1. Add `PRIOR_OUTCOME,` to the `from app.services.learning.evidence import (...)` list (keep it alphabetical, between `OBSERVATION_FLOOR` and `PRIOR_STRENGTH`).
2. In the `TopicState` dataclass add a field after `srs_observations: int = 0`:

```python
    score: float = PRIOR_OUTCOME
```

3. In `state_from_aggregate`, pass the clamped composite into the returned `TopicState(...)`, as the last keyword argument:

```python
        srs_observations=aggregate.srs.observations,
        score=min(1.0, max(0.0, composite)),
    )
```

- [ ] **Step 4: Run to verify it passes, plus the existing suite**

Run: `.venv/Scripts/python -m pytest tests/test_mastery_score.py tests/test_engines.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/services/learning/mastery.py tests/test_mastery_score.py
git commit -m "feat(learning): expose the unrounded composite score on TopicState" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Pure calibration maths

**Files:**
- Create: `app/services/learning/calibration.py`
- Test: `tests/test_calibration.py`

**Interfaces:**
- Consumes: `CONFIDENCE_FLOOR` from `app.services.learning.evidence`.
- Produces:
  - `PredictionRow(predicted: float, correct: bool, confidence: float, difficulty: str | None)` frozen dataclass.
  - `calibration_report(rows: Iterable[PredictionRow]) -> dict` with keys `overall`, `buckets`, `byEvidence`, `byDifficulty`.
  - `overall` and each slice summary: `n, baseRate, meanPredicted, brier, logLoss, baselineBrier, baselineLogLoss`.
  - Each bucket: `lower, upper, n, meanPredicted, observed, lowSample` (`meanPredicted` and `observed` are `None` when `n == 0`).
  - `byEvidence` keys: `belowFloor`, `atOrAboveFloor`. `byDifficulty` keys: the difficulty string, or `UNKNOWN`.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_calibration.py`:

```python
import math

import pytest

from app.services.learning.calibration import (
    BUCKETS,
    LOW_SAMPLE,
    PredictionRow,
    calibration_report,
)


def row(predicted, correct, confidence=0.5, difficulty="INTERMEDIATE"):
    return PredictionRow(predicted, correct, confidence, difficulty)


def test_empty_input_gives_zeroed_report_and_ten_empty_buckets():
    report = calibration_report([])
    assert report["overall"]["n"] == 0
    assert report["overall"]["brier"] == 0
    assert report["overall"]["logLoss"] == 0
    assert len(report["buckets"]) == BUCKETS
    assert all(bucket["n"] == 0 and bucket["lowSample"] for bucket in report["buckets"])
    assert report["buckets"][0]["observed"] is None
    assert report["byDifficulty"] == {}


def test_known_brier_and_log_loss():
    report = calibration_report([row(0.8, True), row(0.8, False)])
    overall = report["overall"]
    assert overall["n"] == 2
    assert overall["baseRate"] == pytest.approx(0.5)
    assert overall["meanPredicted"] == pytest.approx(0.8)
    assert overall["brier"] == pytest.approx(0.34)
    assert overall["baselineBrier"] == pytest.approx(0.25)
    assert overall["logLoss"] == pytest.approx(-(math.log(0.8) + math.log(0.2)) / 2)
    assert overall["baselineLogLoss"] == pytest.approx(math.log(2))


def test_extreme_predictions_keep_log_loss_finite():
    report = calibration_report([row(0.0, True), row(1.0, False)])
    assert math.isfinite(report["overall"]["logLoss"])
    assert report["overall"]["logLoss"] > 0


def test_bucket_edges():
    report = calibration_report(
        [row(0.0, False), row(0.1, True), row(0.9999, True), row(1.0, True)]
    )
    buckets = report["buckets"]
    assert buckets[0]["n"] == 1
    assert buckets[1]["n"] == 1
    assert buckets[9]["n"] == 2
    assert buckets[9]["observed"] == 1.0
    assert buckets[9]["lower"] == pytest.approx(0.9)
    assert buckets[9]["upper"] == pytest.approx(1.0)


def test_low_sample_flag_flips_at_the_threshold():
    few = calibration_report([row(0.55, True)] * (LOW_SAMPLE - 1))
    enough = calibration_report([row(0.55, True)] * LOW_SAMPLE)
    assert few["buckets"][5]["lowSample"] is True
    assert enough["buckets"][5]["lowSample"] is False


def test_evidence_split_uses_the_confidence_floor():
    report = calibration_report(
        [row(0.5, True, confidence=0.2), row(0.5, False, confidence=0.35)]
    )
    assert report["byEvidence"]["belowFloor"]["n"] == 1
    assert report["byEvidence"]["atOrAboveFloor"]["n"] == 1


def test_difficulty_split_names_missing_difficulty_unknown():
    report = calibration_report(
        [row(0.5, True, difficulty="BASIC"), row(0.5, True, difficulty=None)]
    )
    assert set(report["byDifficulty"]) == {"BASIC", "UNKNOWN"}
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/Scripts/python -m pytest tests/test_calibration.py -v`
Expected: FAIL (`ModuleNotFoundError: app.services.learning.calibration`).

- [ ] **Step 3: Implement**

Create `app/services/learning/calibration.py`:

```python
"""Score the engine's predictions against what students actually did.

Pure: takes plain rows, touches no database.
"""

import math
from collections.abc import Iterable
from dataclasses import dataclass

from app.services.learning.evidence import CONFIDENCE_FLOOR

BUCKETS = 10
LOW_SAMPLE = 30
EPSILON = 1e-6


@dataclass(frozen=True)
class PredictionRow:
    predicted: float
    correct: bool
    confidence: float
    difficulty: str | None


def _clip(value: float) -> float:
    return min(1 - EPSILON, max(EPSILON, value))


def _log_loss(predicted: float, correct: bool) -> float:
    p = _clip(predicted)
    return -math.log(p if correct else 1 - p)


def _summary(rows: list[PredictionRow]) -> dict:
    n = len(rows)
    if n == 0:
        return {
            "n": 0,
            "baseRate": 0,
            "meanPredicted": 0,
            "brier": 0,
            "logLoss": 0,
            "baselineBrier": 0,
            "baselineLogLoss": 0,
        }
    base = sum(1 for item in rows if item.correct) / n
    clipped = _clip(base)
    return {
        "n": n,
        "baseRate": base,
        "meanPredicted": sum(item.predicted for item in rows) / n,
        "brier": sum((item.predicted - item.correct) ** 2 for item in rows) / n,
        "logLoss": sum(_log_loss(item.predicted, item.correct) for item in rows) / n,
        "baselineBrier": base * (1 - base),
        "baselineLogLoss": -(
            clipped * math.log(clipped) + (1 - clipped) * math.log(1 - clipped)
        ),
    }


def _bucket_index(predicted: float) -> int:
    return min(BUCKETS - 1, max(0, int(predicted * BUCKETS)))


def _buckets(rows: list[PredictionRow]) -> list[dict]:
    grouped: list[list[PredictionRow]] = [[] for _ in range(BUCKETS)]
    for item in rows:
        grouped[_bucket_index(item.predicted)].append(item)
    result = []
    for index, found in enumerate(grouped):
        n = len(found)
        result.append(
            {
                "lower": index / BUCKETS,
                "upper": (index + 1) / BUCKETS,
                "n": n,
                "meanPredicted": sum(i.predicted for i in found) / n if n else None,
                "observed": sum(1 for i in found if i.correct) / n if n else None,
                "lowSample": n < LOW_SAMPLE,
            }
        )
    return result


def calibration_report(rows: Iterable[PredictionRow]) -> dict:
    found = list(rows)
    below = [item for item in found if item.confidence < CONFIDENCE_FLOOR]
    enough = [item for item in found if item.confidence >= CONFIDENCE_FLOOR]
    by_difficulty: dict[str, list[PredictionRow]] = {}
    for item in found:
        by_difficulty.setdefault(item.difficulty or "UNKNOWN", []).append(item)
    return {
        "overall": _summary(found),
        "buckets": _buckets(found),
        "byEvidence": {
            "belowFloor": _summary(below),
            "atOrAboveFloor": _summary(enough),
        },
        "byDifficulty": {key: _summary(items) for key, items in by_difficulty.items()},
    }
```

- [ ] **Step 4: Run to verify it passes**

Run: `.venv/Scripts/python -m pytest tests/test_calibration.py -v`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add app/services/learning/calibration.py tests/test_calibration.py
git commit -m "feat(learning): add pure calibration maths for prediction scoring" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: PredictionLog model, migration and repository

**Files:**
- Modify: `app/database/models/learning.py` (append model; add `Boolean` is already imported)
- Modify: `app/database/models/__init__.py` (import and `__all__`)
- Create: `alembic/versions/a7d3c1e94b52_add_prediction_log.py`
- Create: `app/database/repositories/prediction_log.py`
- Test: `tests/test_prediction_log.py` (first test only)

**Interfaces:**
- Consumes: `id_column()`, `Base`, `Difficulty` enum (already imported in `learning.py`).
- Produces:
  - `PredictionLog` ORM model with attributes `id, student_id, subject_id, topic_id, question_id, source, predicted_p, confidence, acc_observations, difficulty, correct, scoring_version, occurred_at`.
  - `prediction_log_repository.add_many(session, rows: list[PredictionLog]) -> None`.
  - `prediction_log_repository.report_rows(session, *, scoring_version: int | None, subject_id: str | None, since: datetime | None, source: str | None) -> list[tuple[float, bool, float, str | None]]` ordered as `(predicted_p, correct, confidence, difficulty)`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_prediction_log.py` (more tests are appended in Task 4):

```python
from app.database.models import PredictionLog


def test_prediction_log_columns_use_the_camel_case_names():
    columns = {column.name for column in PredictionLog.__table__.columns}
    assert columns == {
        "id",
        "studentId",
        "subjectId",
        "topicId",
        "questionId",
        "source",
        "predictedP",
        "confidence",
        "accObservations",
        "difficulty",
        "correct",
        "scoringVersion",
        "occurredAt",
    }
    indexes = {index.name for index in PredictionLog.__table__.indexes}
    assert indexes == {
        "PredictionLog_version_occurred_idx",
        "PredictionLog_topic_idx",
    }
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/Scripts/python -m pytest tests/test_prediction_log.py -v`
Expected: FAIL (`ImportError: cannot import name 'PredictionLog'`).

- [ ] **Step 3: Add the model**

Append to `app/database/models/learning.py`:

```python
class PredictionLog(Base):
    """What the mastery engine believed just before a student answered.

    Append-only. Never read by the mastery fold or any student-facing path.
    """

    __tablename__ = "PredictionLog"
    __table_args__ = (
        Index("PredictionLog_version_occurred_idx", "scoringVersion", "occurredAt"),
        Index("PredictionLog_topic_idx", "topicId"),
    )

    id: Mapped[str] = id_column()
    student_id: Mapped[str] = mapped_column(
        "studentId", ForeignKey("User.id", ondelete="CASCADE")
    )
    subject_id: Mapped[str | None] = mapped_column(
        "subjectId", ForeignKey("Subject.id")
    )
    topic_id: Mapped[str] = mapped_column("topicId", ForeignKey("Topic.id"))
    question_id: Mapped[str] = mapped_column("questionId", String)
    source: Mapped[str] = mapped_column(String)
    predicted_p: Mapped[float] = mapped_column("predictedP", Float)
    confidence: Mapped[float] = mapped_column(Float)
    acc_observations: Mapped[int] = mapped_column("accObservations", Integer)
    difficulty: Mapped[str | None] = mapped_column(Difficulty)
    correct: Mapped[bool] = mapped_column(Boolean)
    scoring_version: Mapped[int] = mapped_column("scoringVersion", Integer)
    occurred_at: Mapped[datetime] = mapped_column(
        "occurredAt", DateTime(timezone=True)
    )
```

In `app/database/models/__init__.py`, add `PredictionLog,` to the `from app.database.models.learning import (...)` list (alphabetical) and `"PredictionLog",` next to `"LearningEvent",` in `__all__`.

- [ ] **Step 4: Add the migration**

Confirm the head first: `.venv/Scripts/alembic heads` must print `e2c5b8d1a7f3 (head)`. If it differs, use the printed value as `down_revision`.

Create `alembic/versions/a7d3c1e94b52_add_prediction_log.py`:

```python
"""Add PredictionLog so the mastery engine's predictions can be scored

Revision ID: a7d3c1e94b52
Revises: e2c5b8d1a7f3
Create Date: 2026-10-27 10:00:00.000000

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "a7d3c1e94b52"
down_revision = "e2c5b8d1a7f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "PredictionLog",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("studentId", sa.String(), nullable=False),
        sa.Column("subjectId", sa.String(), nullable=True),
        sa.Column("topicId", sa.String(), nullable=False),
        sa.Column("questionId", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("predictedP", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("accObservations", sa.Integer(), nullable=False),
        sa.Column(
            "difficulty",
            postgresql.ENUM(
                "BASIC", "INTERMEDIATE", "ADVANCED", name="Difficulty", create_type=False
            ),
            nullable=True,
        ),
        sa.Column("correct", sa.Boolean(), nullable=False),
        sa.Column("scoringVersion", sa.Integer(), nullable=False),
        sa.Column("occurredAt", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["studentId"], ["User.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subjectId"], ["Subject.id"]),
        sa.ForeignKeyConstraint(["topicId"], ["Topic.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "PredictionLog_version_occurred_idx",
        "PredictionLog",
        ["scoringVersion", "occurredAt"],
    )
    op.create_index("PredictionLog_topic_idx", "PredictionLog", ["topicId"])


def downgrade() -> None:
    op.drop_index("PredictionLog_topic_idx", table_name="PredictionLog")
    op.drop_index("PredictionLog_version_occurred_idx", table_name="PredictionLog")
    op.drop_table("PredictionLog")
```

- [ ] **Step 5: Add the repository**

Create `app/database/repositories/prediction_log.py`:

```python
"""Repository for the append-only prediction log."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import PredictionLog
from app.database.repositories.base import BaseRepository


class PredictionLogRepository(BaseRepository[PredictionLog]):
    model = PredictionLog

    async def add_many(
        self, session: AsyncSession, rows: list[PredictionLog]
    ) -> None:
        if not rows:
            return
        session.add_all(rows)
        await session.flush()

    async def report_rows(
        self,
        session: AsyncSession,
        *,
        scoring_version: int | None,
        subject_id: str | None,
        since: datetime | None,
        source: str | None,
    ) -> list[tuple[float, bool, float, str | None]]:
        statement = select(
            PredictionLog.predicted_p,
            PredictionLog.correct,
            PredictionLog.confidence,
            PredictionLog.difficulty,
        )
        if scoring_version is not None:
            statement = statement.where(PredictionLog.scoring_version == scoring_version)
        if subject_id is not None:
            statement = statement.where(PredictionLog.subject_id == subject_id)
        if since is not None:
            statement = statement.where(PredictionLog.occurred_at >= since)
        if source is not None:
            statement = statement.where(PredictionLog.source == source)
        result = await self.rows(session, statement)
        return [tuple(found) for found in result.all()]


prediction_log_repository = PredictionLogRepository()
```

- [ ] **Step 6: Verify**

Run:
```
.venv/Scripts/python -m pytest tests/test_prediction_log.py -v
.venv/Scripts/alembic heads
.venv/Scripts/python -c "import app.database.repositories.prediction_log"
```
Expected: test PASS; `alembic heads` prints `a7d3c1e94b52 (head)`; import succeeds. If a development database is reachable, also run `.venv/Scripts/alembic upgrade head` then `.venv/Scripts/alembic downgrade -1` then `upgrade head`; if it is unreachable, say so in the task report rather than claiming the migration was applied.

- [ ] **Step 7: Commit**

```bash
git add app/database/models/learning.py app/database/models/__init__.py alembic/versions/a7d3c1e94b52_add_prediction_log.py app/database/repositories/prediction_log.py tests/test_prediction_log.py
git commit -m "feat(learning): add PredictionLog table, migration and repository" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The prediction-logging service

**Files:**
- Create: `app/services/learning/prediction_log.py`
- Test: `tests/test_prediction_log.py` (append)

**Interfaces:**
- Consumes: `TopicState.score/confidence/acc_observations` (Task 1), `PredictionLog` and `prediction_log_repository.add_many` (Task 3), `GetTopicMasteryService(session, student_id, topic_ids).process() -> dict[str, TopicState]`, `PredictionRow` and `calibration_report` (Task 2).
- Produces:
  - `AnsweredQuestion(topic_id: str | None, subject_id: str | None, question_id: str, difficulty: str | None, correct: bool | None, occurred_at: datetime)` frozen dataclass.
  - `build_rows(student_id: str, source: str, answered: list[AnsweredQuestion], states: dict[str, TopicState]) -> list[PredictionLog]`.
  - `async record_predictions(session, student_id: str, source: str, answered: list[AnsweredQuestion]) -> None`.
  - `GetCalibrationReportService(session, *, scoring_version=None, subject_id=None, since=None, source=None)` with `async process() -> dict` (used in Task 6).

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_prediction_log.py`:

```python
from datetime import UTC, datetime

import pytest

from app.services.learning import prediction_log
from app.services.learning.evidence import SCORING_VERSION
from app.services.learning.mastery import TopicState
from app.services.learning.prediction_log import (
    AnsweredQuestion,
    build_rows,
    record_predictions,
)

NOW = datetime(2026, 10, 27, tzinfo=UTC)


def answered(topic_id="t1", question_id="q1", correct=True, difficulty="BASIC"):
    return AnsweredQuestion(
        topic_id=topic_id,
        subject_id="s1",
        question_id=question_id,
        difficulty=difficulty,
        correct=correct,
        occurred_at=NOW,
    )


STATES = {
    "t1": TopicState(topic_id="t1", score=0.6, confidence=0.5, acc_observations=3),
}


def test_build_rows_copies_the_prediction_and_the_outcome():
    (found,) = build_rows("stu", "ASSESSMENT", [answered()], STATES)
    assert found.student_id == "stu"
    assert found.topic_id == "t1"
    assert found.subject_id == "s1"
    assert found.question_id == "q1"
    assert found.source == "ASSESSMENT"
    assert found.predicted_p == pytest.approx(0.6)
    assert found.confidence == pytest.approx(0.5)
    assert found.acc_observations == 3
    assert found.difficulty == "BASIC"
    assert found.correct is True
    assert found.scoring_version == SCORING_VERSION
    assert found.occurred_at == NOW


def test_build_rows_skips_unknown_topic_unknown_outcome_and_missing_state():
    rows = build_rows(
        "stu",
        "ASSESSMENT",
        [
            answered(topic_id=None),
            answered(question_id="q2", correct=None),
            answered(topic_id="gone", question_id="q3"),
        ],
        STATES,
    )
    assert rows == []


class _Nested:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False


class FakeSession:
    def begin_nested(self):
        return _Nested()


class FakeRepository:
    def __init__(self):
        self.added = []

    async def add_many(self, session, rows):
        self.added.extend(rows)


@pytest.fixture
def repository(monkeypatch):
    fake = FakeRepository()
    monkeypatch.setattr(prediction_log, "prediction_log_repository", fake)
    return fake


def fake_mastery(monkeypatch, states=None, error=None, calls=None):
    class FakeMastery:
        def __init__(self, session, student_id, topic_ids=None):
            if calls is not None:
                calls.append(sorted(topic_ids))

        async def process(self):
            if error is not None:
                raise error
            return states

    monkeypatch.setattr(prediction_log, "GetTopicMasteryService", FakeMastery)


async def test_record_predictions_reads_each_topic_once_and_writes_rows(
    monkeypatch, repository
):
    calls = []
    fake_mastery(monkeypatch, states=STATES, calls=calls)
    await record_predictions(
        FakeSession(),
        "stu",
        "ASSESSMENT",
        [answered(question_id="q1"), answered(question_id="q2", correct=False)],
    )
    assert calls == [["t1"]]
    assert [row.question_id for row in repository.added] == ["q1", "q2"]


async def test_record_predictions_with_no_topics_does_nothing(monkeypatch, repository):
    calls = []
    fake_mastery(monkeypatch, states=STATES, calls=calls)
    await record_predictions(
        FakeSession(), "stu", "ASSESSMENT", [answered(topic_id=None)]
    )
    assert calls == []
    assert repository.added == []


async def test_record_predictions_swallows_a_failure(monkeypatch, repository):
    fake_mastery(monkeypatch, error=RuntimeError("db down"))
    await record_predictions(FakeSession(), "stu", "ASSESSMENT", [answered()])
    assert repository.added == []


async def test_report_service_passes_filters_and_scores_rows(monkeypatch):
    seen = {}

    class ReportRepository:
        async def report_rows(self, session, **filters):
            seen.update(filters)
            return [(0.8, True, 0.5, "BASIC"), (0.8, False, 0.5, None)]

    monkeypatch.setattr(prediction_log, "prediction_log_repository", ReportRepository())
    report = await prediction_log.GetCalibrationReportService(
        FakeSession(), scoring_version=3, subject_id="s1", since=NOW, source="ASSESSMENT"
    ).process()
    assert seen == {
        "scoring_version": 3,
        "subject_id": "s1",
        "since": NOW,
        "source": "ASSESSMENT",
    }
    assert report["overall"]["n"] == 2
    assert set(report["byDifficulty"]) == {"BASIC", "UNKNOWN"}
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/Scripts/python -m pytest tests/test_prediction_log.py -v`
Expected: FAIL (`ImportError: cannot import name 'prediction_log'`).

- [ ] **Step 3: Implement**

Create `app/services/learning/prediction_log.py`:

```python
"""Log what the mastery engine believed just before a student answered.

Call `record_predictions` BEFORE the submission's own LearningEvent rows are
added, so an answer cannot leak into its own prediction. A failure here is
logged and swallowed: it must never fail the student's submission.
"""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ids import cuid
from app.core.logger import logger
from app.database.models import PredictionLog
from app.database.repositories.prediction_log import prediction_log_repository
from app.services.learning.calibration import PredictionRow, calibration_report
from app.services.learning.evidence import SCORING_VERSION
from app.services.learning.mastery import TopicState
from app.services.learning.mastery_store import GetTopicMasteryService


@dataclass(frozen=True)
class AnsweredQuestion:
    topic_id: str | None
    subject_id: str | None
    question_id: str
    difficulty: str | None
    correct: bool | None
    occurred_at: datetime


def build_rows(
    student_id: str,
    source: str,
    answered: list[AnsweredQuestion],
    states: dict[str, TopicState],
) -> list[PredictionLog]:
    rows = []
    for item in answered:
        if not item.topic_id or item.correct is None:
            continue
        state = states.get(item.topic_id)
        if state is None:
            continue
        rows.append(
            PredictionLog(
                id=cuid(),
                student_id=student_id,
                subject_id=item.subject_id,
                topic_id=item.topic_id,
                question_id=item.question_id,
                source=source,
                predicted_p=state.score,
                confidence=state.confidence,
                acc_observations=state.acc_observations,
                difficulty=item.difficulty,
                correct=item.correct,
                scoring_version=SCORING_VERSION,
                occurred_at=item.occurred_at,
            )
        )
    return rows


async def record_predictions(
    session: AsyncSession,
    student_id: str,
    source: str,
    answered: list[AnsweredQuestion],
) -> None:
    topic_ids = sorted({item.topic_id for item in answered if item.topic_id})
    if not topic_ids:
        return
    try:
        async with session.begin_nested():
            states = await GetTopicMasteryService(session, student_id, topic_ids).process()
            rows = build_rows(student_id, source, answered, states)
            await prediction_log_repository.add_many(session, rows)
    except Exception:
        logger.exception("Prediction log write failed for %s", student_id)


class GetCalibrationReportService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        scoring_version: int | None = None,
        subject_id: str | None = None,
        since: datetime | None = None,
        source: str | None = None,
    ) -> None:
        self.session = session
        self.scoring_version = scoring_version
        self.subject_id = subject_id
        self.since = since
        self.source = source

    async def process(self) -> dict:
        found = await prediction_log_repository.report_rows(
            self.session,
            scoring_version=self.scoring_version,
            subject_id=self.subject_id,
            since=self.since,
            source=self.source,
        )
        return calibration_report(
            PredictionRow(predicted, correct, confidence, difficulty)
            for predicted, correct, confidence, difficulty in found
        )
```

- [ ] **Step 4: Run to verify it passes**

Run: `.venv/Scripts/python -m pytest tests/test_prediction_log.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/services/learning/prediction_log.py tests/test_prediction_log.py
git commit -m "feat(learning): log engine predictions before answers are recorded" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Hook the two answer emitters

**Files:**
- Modify: `app/services/assessments/service.py` (`SubmitAttemptService._persist_responses`)
- Modify: `app/services/learning/service.py` (`RecordTopicAnswersService.process`, plus a small module-level helper)
- Test: `tests/test_prediction_hooks.py`

**Interfaces:**
- Consumes: `record_predictions`, `AnsweredQuestion` (Task 4).
- Produces: nothing new for later tasks; behaviour is that a `record_predictions` call precedes the first `LearningEvent` insert in each emitter.

**Import-cycle warning:** `app.services.learning/__init__` imports `learning.service`, which imports `app.services.assessments.grading`, which loads the `app.services.assessments` package (its `__init__` imports `assessments.service`). So `assessments/service.py` MUST import `record_predictions` **inside the method**, as it already does for `RecordPretestPassService`. `learning/service.py` may import it at module top.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_prediction_hooks.py`:

```python
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from app.api.schemas import TopicAnswerIn, TopicAnswersIn
from app.services.assessments import service as assessments
from app.services.learning import service as learning

NOW = datetime(2026, 10, 27, tzinfo=UTC)


def question(question_id="q1", topic_id="t1", answer="A"):
    return SimpleNamespace(
        id=question_id,
        topic_id=topic_id,
        subject_id="s1",
        difficulty="BASIC",
        correct_answer=answer,
    )


class Recorder:
    """Records the order of calls made by the code under test."""

    def __init__(self):
        self.calls = []
        self.logged = []


@pytest.fixture
def recorder():
    return Recorder()


# --- assessments -----------------------------------------------------------


def patch_assessments(monkeypatch, recorder):
    async def fake_record(session, student_id, source, answered):
        recorder.calls.append("predict")
        recorder.logged.extend((source, item) for item in answered)

    async def fake_add(session, entity):
        recorder.calls.append("event")

    async def fake_response_add(session, entity):
        recorder.calls.append("response")

    from app.services.learning import prediction_log

    monkeypatch.setattr(prediction_log, "record_predictions", fake_record)
    monkeypatch.setattr(assessments.learning_events_repository, "add", fake_add)
    monkeypatch.setattr(assessments.responses_repository, "add", fake_response_add)
    monkeypatch.setattr(assessments, "is_coverage", lambda _question: False)


def submit_service():
    service = assessments.SubmitAttemptService.__new__(assessments.SubmitAttemptService)
    service.session = object()
    service.student_id = "stu"
    return service


async def test_assessment_predictions_are_logged_before_any_event(
    monkeypatch, recorder
):
    patch_assessments(monkeypatch, recorder)
    rows = [
        {"question": question("q1"), "selected": "A", "correct": True,
         "seconds": 10, "flagged": False},
        {"question": question("q2"), "selected": "B", "correct": False,
         "seconds": 12, "flagged": False},
    ]
    await submit_service()._persist_responses(SimpleNamespace(id="a1"), rows, NOW)
    assert recorder.calls[0] == "predict"
    assert recorder.calls.count("predict") == 1
    assert recorder.calls.count("event") == 2
    assert {item.question_id for _source, item in recorder.logged} == {"q1", "q2"}
    assert {source for source, _item in recorder.logged} == {"ASSESSMENT"}


async def test_unanswered_questions_are_not_logged(monkeypatch, recorder):
    patch_assessments(monkeypatch, recorder)
    rows = [
        {"question": question("q1"), "selected": None, "correct": False,
         "seconds": 0, "flagged": False},
    ]
    await submit_service()._persist_responses(SimpleNamespace(id="a1"), rows, NOW)
    assert all(item.correct is None for _source, item in recorder.logged)


async def test_unmapped_questions_are_passed_with_no_topic(monkeypatch, recorder):
    patch_assessments(monkeypatch, recorder)
    rows = [
        {"question": question("q1", topic_id=None), "selected": "A", "correct": True,
         "seconds": 5, "flagged": False},
    ]
    await submit_service()._persist_responses(SimpleNamespace(id="a1"), rows, NOW)
    assert recorder.logged[0][1].topic_id is None


# --- lesson checks ---------------------------------------------------------


def patch_learning(monkeypatch, recorder, bank):
    async def fake_record(session, student_id, source, answered):
        recorder.calls.append("predict")
        recorder.logged.extend((source, item) for item in answered)

    async def fake_add(session, entity):
        recorder.calls.append("event")

    async def fake_recorded(session, student_id, topic_id, kind):
        return set()

    async def fake_subject(session, key):
        return SimpleNamespace(id="s1")

    async def fake_topic(session, subject_id, slug):
        return SimpleNamespace(id="t1", subject_id="s1")

    async def fake_many(session, statement):
        return list(bank)

    async def fake_checks(self, topic):
        return {}

    monkeypatch.setattr(learning, "record_predictions", fake_record)
    monkeypatch.setattr(learning.learning_events_repository, "add", fake_add)
    monkeypatch.setattr(
        learning.learning_events_repository, "recorded_sources", fake_recorded
    )
    monkeypatch.setattr(learning.subjects_repository, "by_id_or_slug", fake_subject)
    monkeypatch.setattr(learning.topics_repository, "by_slug", fake_topic)
    monkeypatch.setattr(learning.questions_repository, "many", fake_many)
    monkeypatch.setattr(learning.RecordTopicAnswersService, "_lesson_checks", fake_checks)


class FlushSession:
    async def flush(self):
        pass


async def test_lesson_predictions_are_logged_once_before_events_and_deduped(
    monkeypatch, recorder
):
    patch_learning(monkeypatch, recorder, [question("q1"), question("q2")])
    body = TopicAnswersIn(
        subjectId="maths",
        topic="algebra",
        answers=[
            TopicAnswerIn(questionId="q1", selectedAnswer="A"),
            TopicAnswerIn(questionId="q1", selectedAnswer="B"),
            TopicAnswerIn(questionId="q2", firstTry=False),
        ],
    )
    result = await learning.RecordTopicAnswersService(FlushSession(), "stu", body).process()
    assert result == {"recorded": 2}
    assert recorder.calls == ["predict", "event", "event"]
    logged = {item.question_id: item.correct for _source, item in recorder.logged}
    assert logged == {"q1": True, "q2": False}
    assert {source for source, _item in recorder.logged} == {"LESSON_CHECK"}
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/Scripts/python -m pytest tests/test_prediction_hooks.py -v`
Expected: FAIL (the services never call `record_predictions`; `learning.record_predictions` does not exist).

- [ ] **Step 3: Hook the assessments emitter**

In `app/services/assessments/service.py`, at the start of `SubmitAttemptService._persist_responses`, before `for item in response_rows:`, add:

```python
        from app.services.learning.prediction_log import (
            AnsweredQuestion,
            record_predictions,
        )

        # Before any event below exists, so an answer cannot predict itself.
        # A blank is not evidence of what the student knew: only answered
        # questions are scored.
        await record_predictions(
            self.session,
            self.student_id,
            "ASSESSMENT",
            [
                AnsweredQuestion(
                    topic_id=item["question"].topic_id,
                    subject_id=item["question"].subject_id,
                    question_id=item["question"].id,
                    difficulty=item["question"].difficulty,
                    correct=None if item["selected"] is None else item["correct"],
                    occurred_at=now,
                )
                for item in response_rows
            ],
        )
```

- [ ] **Step 4: Hook the lesson emitter**

In `app/services/learning/service.py`:

1. Add to the imports (with the other `app.services.learning` imports): 

```python
from app.services.learning.prediction_log import AnsweredQuestion, record_predictions
```

2. Add this module-level helper just above `class RecordTopicAnswersService`:

```python
def _bank_answer_correct(item, question) -> bool:
    return (
        str(item.selectedAnswer) == str(question.correct_answer)
        if item.selectedAnswer is not None
        else bool(item.firstTry)
    )
```

3. In `RecordTopicAnswersService.process`, replace the lines

```python
        recorded = 0
        seen: set[str] = set()
        now = utcnow()
        for item in self.body.answers:
```

with

```python
        now = utcnow()
        first_answers = {}
        for item in self.body.answers:
            first_answers.setdefault(item.questionId, item)
        answered = []
        for item in first_answers.values():
            question = bank.get(item.questionId)
            if question is None:
                continue
            answered.append(
                AnsweredQuestion(
                    topic_id=topic.id,
                    subject_id=subject.id,
                    question_id=question.id,
                    difficulty=question.difficulty,
                    correct=_bank_answer_correct(item, question),
                    occurred_at=now,
                )
            )
        # Before any event below exists, so an answer cannot predict itself.
        await record_predictions(self.session, self.student_id, "LESSON_CHECK", answered)

        recorded = 0
        seen: set[str] = set()
        for item in self.body.answers:
```

4. In the existing loop, replace the inline `correct = (...)` expression

```python
                correct = (
                    str(item.selectedAnswer) == str(question.correct_answer)
                    if item.selectedAnswer is not None
                    else bool(item.firstTry)
                )
```

with

```python
                correct = _bank_answer_correct(item, question)
```

- [ ] **Step 5: Run to verify it passes, and that imports do not cycle**

Run:
```
.venv/Scripts/python -m pytest tests/test_prediction_hooks.py -v
.venv/Scripts/python -c "import app.services.assessments, app.services.learning"
.venv/Scripts/python -c "import app.services.learning, app.services.assessments"
.venv/Scripts/python -m pytest -q
```
Expected: new tests PASS, both imports succeed, full suite passes (compare against the failures recorded in `.pytest_cache/v/cache/lastfailed` before you started, and report any pre-existing failures rather than fixing them silently).

- [ ] **Step 6: Commit**

```bash
git add app/services/assessments/service.py app/services/learning/service.py tests/test_prediction_hooks.py
git commit -m "feat(learning): log predictions before assessment and lesson answers" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Admin calibration endpoint

**Files:**
- Modify: `app/api/responses.py` (add `CalibrationOut` after `AnalyticsOut`)
- Create: `app/api/admin/calibration.py`
- Modify: `app/api/admin/__init__.py` (register router)
- Test: `tests/test_calibration_endpoint.py`

**Interfaces:**
- Consumes: `GetCalibrationReportService` (Task 4), `require_admin`, `AnSession`, `Admin`.
- Produces: `GET {admin prefix}/calibration` with optional query parameters `scoringVersion: int`, `subjectId: str`, `since: datetime`, `source: str`, returning `CalibrationOut`.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_calibration_endpoint.py`:

```python
from datetime import UTC, datetime

from app.api.admin import calibration
from app.api.deps import require_admin


def route():
    return next(found for found in calibration.router.routes if found.path == "/calibration")


def test_route_requires_an_admin():
    calls = [dependency.call for dependency in route().dependant.dependencies]
    assert require_admin in calls


def test_route_accepts_the_documented_filters():
    names = {param.name for param in route().dependant.query_params}
    assert names == {"scoringVersion", "subjectId", "since", "source"}


async def test_handler_passes_filters_to_the_service(monkeypatch):
    seen = {}

    class FakeService:
        def __init__(self, session, **filters):
            seen.update(filters)

        async def process(self):
            return {"overall": {}, "buckets": [], "byEvidence": {}, "byDifficulty": {}}

    monkeypatch.setattr(calibration, "GetCalibrationReportService", FakeService)
    since = datetime(2026, 10, 1, tzinfo=UTC)
    await calibration.admin_calibration(
        session=object(),
        admin=object(),
        scoringVersion=3,
        subjectId="s1",
        since=since,
        source="LESSON_CHECK",
    )
    assert seen == {
        "scoring_version": 3,
        "subject_id": "s1",
        "since": since,
        "source": "LESSON_CHECK",
    }
```

- [ ] **Step 2: Run to verify it fails**

Run: `.venv/Scripts/python -m pytest tests/test_calibration_endpoint.py -v`
Expected: FAIL (`ImportError: cannot import name 'calibration'`).

- [ ] **Step 3: Add the response model**

In `app/api/responses.py`, after `class AnalyticsOut(ApiOut):` block:

```python
class CalibrationOut(ApiOut):
    overall: dict
    buckets: list[dict]
    byEvidence: dict
    byDifficulty: dict
```

- [ ] **Step 4: Add the router**

Create `app/api/admin/calibration.py`:

```python
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import require_admin
from app.api.responses import CalibrationOut
from app.database.db import AnSession
from app.database.models import Admin
from app.services.learning.prediction_log import GetCalibrationReportService

router = APIRouter(prefix="/calibration", tags=["Admin / Calibration"])


@router.get("", response_model=CalibrationOut)
async def admin_calibration(
    session: AnSession,
    admin: Annotated[Admin, Depends(require_admin)],
    scoringVersion: int | None = None,
    subjectId: str | None = None,
    since: datetime | None = None,
    source: str | None = None,
):
    return await GetCalibrationReportService(
        session,
        scoring_version=scoringVersion,
        subject_id=subjectId,
        since=since,
        source=source,
    ).process()
```

- [ ] **Step 5: Register it**

In `app/api/admin/__init__.py`, add `from app.api.admin.calibration import router as calibration_router` with the other admin imports (keep the import block sorted), and `router.include_router(calibration_router)` after `router.include_router(analytics_router)`.

- [ ] **Step 6: Run to verify it passes, then lint**

Run:
```
.venv/Scripts/python -m pytest tests/test_calibration_endpoint.py -v
.venv/Scripts/python -c "from app.api.admin import router; print([r.path for r in router.routes if 'calibration' in r.path])"
.venv/Scripts/ruff check app tests
.venv/Scripts/ruff format --check app tests
.venv/Scripts/python -m pytest -q
```
Expected: tests PASS; the second command prints a list containing a `/calibration` path; ruff clean (fix formatting with `ruff format` on the files this plan touched only); full suite passes apart from any pre-existing failures you reported in Task 5.

- [ ] **Step 7: Commit**

```bash
git add app/api/responses.py app/api/admin/calibration.py app/api/admin/__init__.py tests/test_calibration_endpoint.py
git commit -m "feat(admin): add GET /calibration to score the mastery engine's predictions" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review notes (plan author)

- **Spec coverage:** data model (Task 3), write path and failure isolation (Tasks 4-5), both emitters (Task 5), report with overall, buckets, evidence and difficulty slices, filters and `lowSample` (Tasks 2, 4, 6), auth (Task 6), empty-set behaviour (Task 2). Open questions in the spec (retention, pretests) are intentionally not implemented.
- **One deliberate refinement of the spec:** unanswered assessment questions are not logged (`correct=None`), because the engine records a blank as wrong but a blank says nothing about knowledge. Flag this to the reviewer; reverting is a one-line change in Task 5 Step 3.
- **Not verified by this plan's tests:** the migration against a real database, and the `GetTopicMasteryService` side-effect write on the submit path under load. Run the migration on a development database and watch submit latency once deployed.
