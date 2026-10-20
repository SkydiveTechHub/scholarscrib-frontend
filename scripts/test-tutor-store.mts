import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { selectActiveEntry, useTutorStore } from "../src/stores/tutor-store";

const LESSON = {
  context: { type: "lesson", lessonId: "L1" } as const,
  label: "Cells",
};
const QUESTION = { context: { type: "question", questionId: "Q1" } as const };

beforeEach(() => {
  useTutorStore.setState({ open: false, pageEntry: null, overrideEntry: null });
});

test("with nothing registered the active context is general", () => {
  assert.deepEqual(selectActiveEntry(useTutorStore.getState()).context, {
    type: "general",
  });
});

test("opening uses the page's context", () => {
  useTutorStore.getState().setPageEntry(LESSON);
  useTutorStore.getState().openPanel();
  const s = useTutorStore.getState();
  assert.equal(s.open, true);
  assert.deepEqual(selectActiveEntry(s), LESSON);
});

test("an explicit entry overrides the page and is forgotten on close", () => {
  useTutorStore.getState().setPageEntry(LESSON);
  useTutorStore.getState().openPanel(QUESTION);
  assert.deepEqual(selectActiveEntry(useTutorStore.getState()), QUESTION);
  useTutorStore.getState().closePanel();
  assert.deepEqual(selectActiveEntry(useTutorStore.getState()), LESSON);
});

test("detach switches to general chat without losing the page entry", () => {
  useTutorStore.getState().setPageEntry(LESSON);
  useTutorStore.getState().openPanel();
  useTutorStore.getState().detach();
  assert.deepEqual(selectActiveEntry(useTutorStore.getState()).context, {
    type: "general",
  });
  assert.deepEqual(useTutorStore.getState().pageEntry, LESSON);
});

test("clearing the page entry (navigating away) falls back to general", () => {
  useTutorStore.getState().setPageEntry(LESSON);
  useTutorStore.getState().setPageEntry(null);
  assert.deepEqual(selectActiveEntry(useTutorStore.getState()).context, {
    type: "general",
  });
});
