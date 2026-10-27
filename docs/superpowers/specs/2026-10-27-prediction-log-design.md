# Prediction Log and Calibration Report

Date: 2026-10-27
Status: Draft, awaiting review
Scope: `scholarscrib-backend` only

## Problem

The mastery engine (`app/services/learning/evidence.py`, `mastery.py`) is tuned
by intuition. The recency half-life (45 days), the prior (0.45, strength 4),
the thresholds (60 / 70 / 85), the stability buckets (5 / 14 / 30 / 60 days)
and the difficulty outcome table have never been checked against what
students actually do next. Nothing records what the engine believed before an
answer, so there is nothing to score it against.

## Goal

Record, for every answered question, the engine's prediction made *before* the
answer, next to the real result. Provide an admin report that scores those
predictions (Brier score, log-loss, calibration buckets) so the parameters can
be tuned from data.

## Non-goals (v1)

- Automatic parameter tuning.
- Mapping the engine score to a calibrated probability.
- A frontend dashboard.
- Backfilling history from the `LearningEvent` ledger.
- Any change to student-facing behaviour.

## Definitions

- **Prediction (p̂).** The engine has no P(correct) today. `mastery` is a 0-100
  score and a correct answer is worth 0.85-1.0 depending on difficulty. v1 logs
  the *unrounded composite score* (0-1) from `state_from_aggregate` as p̂. The
  calibration buckets show how that score maps to observed accuracy; a mapping
  layer is a later change.
- **Prediction time.** The topic state *before* the submission's own events
  exist. For a batch attempt, every question of the same topic uses the state
  from before the attempt (no sequential updating within the sitting). This
  avoids an answer leaking into its own prediction.

## Design

### 1. Data: `PredictionLog`

New table, model in `app/database/models/learning.py`, new alembic migration.

| Column | Type | Notes |
|---|---|---|
| `id` | cuid | primary key |
| `studentId` | FK `User.id` | `ON DELETE CASCADE`, as `LearningEvent` |
| `subjectId` | FK `Subject.id` | nullable |
| `topicId` | FK `Topic.id` | required; rows without a topic are not logged |
| `questionId` | string | the question's id (`sourceId` of the event) |
| `source` | string | `ASSESSMENT` or `LESSON_CHECK` |
| `predictedP` | float | 0-1, unrounded composite score |
| `confidence` | float | `TopicState.confidence` at prediction time |
| `accObservations` | int | `TopicState.acc_observations` at prediction time |
| `difficulty` | enum `Difficulty` | nullable |
| `correct` | bool | the real outcome |
| `scoringVersion` | int | `SCORING_VERSION` at prediction time |
| `occurredAt` | timestamptz | same value as the paired event |

Indexes: `(scoringVersion, occurredAt)` and `(topicId)`.

Rows are append-only and never read by the mastery fold or any student-facing
path.

### 2. Write path

New module `app/services/learning/prediction_log.py` exposing:

```
record_predictions(session, student_id, answered) -> None
```

`answered` is a list of items carrying topic id, subject id, question id,
difficulty, correct, source and the event time.

Behaviour:

1. Drop items with no `topic_id`.
2. Call `GetTopicMasteryService(session, student_id, distinct_topic_ids)`
   once to get each topic's state.
3. Build one `PredictionLog` row per remaining item and insert them.
4. Wrap steps 2-3 in `session.begin_nested()` with a logged exception, the
   same pattern as `mastery_store._persist`. A failure here must never fail
   the student's submission.

Callers, each invoking it *before* their `LearningEvent` inserts:

- `app/services/assessments/service.py`, `_persist_responses`, source
  `ASSESSMENT`.
- `app/services/learning/service.py`, the knowledge-check loop that emits
  `QUESTION_ANSWERED`, source `LESSON_CHECK`. Only bank-question answers are
  logged; self-marked or block-check answers without a bank question are not.

Known side effect: the mastery read persists its fold results, as it already
does elsewhere. This adds one such write to the submit path.

### 3. Report: `GET /admin/calibration`

New router in `app/api/admin/`, guarded by `require_admin`, registered beside
the stats routers.

Query parameters (all optional): `scoringVersion`, `subjectId`, `since`,
`source`.

Response:

- `overall`: `n`, `baseRate`, `meanPredicted`, `brier`, `logLoss`,
  `baselineBrier`, `baselineLogLoss` (the always-predict-base-rate baseline).
- `buckets`: ten bins over p̂, each with `lower`, `upper`, `n`,
  `meanPredicted`, `observed`, and `lowSample` (true when `n < 30`).
- `byEvidence`: the same summary for `confidence < CONFIDENCE_FLOOR` versus
  `>= CONFIDENCE_FLOOR`.
- `byDifficulty`: the same summary per difficulty.

The maths lives in a pure function `calibration_report(rows)` in
`app/services/learning/calibration.py`, taking plain tuples, so it is testable
without a database (mirroring `mastery.py`). p̂ is clipped to `[1e-6, 1-1e-6]`
before log-loss. An empty result set returns zeroed fields, not an error.

## Error handling

- Prediction write failure: logged, swallowed, submission unaffected.
- Report with no rows: empty-state response, HTTP 200.
- Unknown filter values: empty result, not an error.

## Testing

- Pure-function tests for `calibration_report`: Brier, log-loss, baseline,
  bucket edges (p̂ = 0, 1, bin boundaries), clipping, empty input,
  `lowSample` flag.
- Service tests: predictions are computed from the pre-submission state; the
  prediction row count equals the number of topic-mapped answers; a forced
  failure in `record_predictions` does not fail the submission.
- Endpoint test: admin auth required; each filter narrows the result.

## Open questions

- Retention policy for `PredictionLog` (it grows with every answer). v1 keeps
  everything; revisit when volume is known.
- Whether to log pretest answers. v1 follows the two emitters above; pretests
  go through their own service and are excluded.
