import { test } from "node:test";
import assert from "node:assert/strict";
import { tutorThreadQuery } from "../src/hooks/api/use-tutor";

// A reopened panel must show what was just said. The conversation lives in the
// chat reducer, which is gone once the panel closes, so a cached thread from
// before the exchange would make it look like it vanished.
test("a thread is never served stale from cache when the panel reopens", () => {
  const options = tutorThreadQuery({ type: "lesson", lessonId: "L1" }, undefined);
  assert.equal(options.staleTime, 0);
  assert.equal(options.gcTime, 0);
  assert.deepEqual(options.queryKey, ["tutor", "thread", "lesson:L1"]);
});
