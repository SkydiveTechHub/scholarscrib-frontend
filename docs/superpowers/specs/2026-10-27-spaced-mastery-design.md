# Spaced mastery: design

Date: 2026-10-27. Backend: `scholarscrib-backend`. Review priority 2.

## Goal

A topic is MASTERED only when its evidence is spread over at least two
different Lagos calendar days, so one cramming session cannot produce it.

## Current behaviour

`is_mastered` (`app/services/learning/mastery.py`) is
`mastery >= TARGET (70) and observations >= MASTERY_MIN_QUESTIONS (7)`.
It ignores when the evidence happened. It is used by the planner
(`planner/topics.py`), pages service (`pages.py`) and `graph_colour`.

## Design

**Rule.** MASTERED = existing condition AND `evidence_days >= MASTERY_MIN_DAYS`
(constant, 2, in `evidence.py`). The 0-100 mastery score, retention curve and
confidence are unchanged.

**Tracking.** `TopicAggregate` gains `evidence_days: int = 0` and
`last_evidence_day: str | None` (Lagos `YYYY-MM-DD`). In `apply_event`, for
events that add evidence (scored `QUESTION_ANSWERED`; lesson events with a
score), compute `lagos_day_key(occurred)`; if it differs from
`last_evidence_day`, increment `evidence_days` and set `last_evidence_day`.
Events fold in `seq` order, so no date list is needed. Known limit: events
applied out of chronological order can over-count a day.

**Storage.** `TopicMastery` gains `evidenceDays` (int, default 0) and
`lastEvidenceDay` (string, nullable). One Alembic migration, safe defaults.
`mastery_store._persist` and `_aggregate` read and write both.

**Rebuild.** `SCORING_VERSION` 3 -> 4. `fold_events` already resets an
aggregate on a version mismatch and replays events, so day counts rebuild from
history. `fold_events` reset block also clears the two new fields. No backfill
script.

**State.** `TopicState` gains `evidence_days: int = 0`, set in
`state_from_aggregate`. It lets the API tell a student a high-scoring topic
needs another day. Only the backend field is in scope here; frontend wording is
a later step.

## Visible effect

Topics currently MASTERED from single-day evidence become STARTED until the
student practises on another day. Intended; note it in release notes.

## Out of scope

Changing the score, minimum gaps (N days apart), delayed-check cards, frontend
copy, and the unmapped-questions gap (answers with no topic never reach
mastery).

## Testing

- Seven strong answers on one day: not mastered, `evidence_days == 1`.
- Same answers across two Lagos days: mastered.
- Lagos boundary: 23:30 and 00:30 local count as two days; two times on the
  same local day count as one.
- Version bump: a v3 aggregate refolds and rebuilds `evidence_days` from events.
- Persist round trip of both new columns.
- Update planner and pages tests that assume instant mastery.
- Migration head test stays at a single head.
