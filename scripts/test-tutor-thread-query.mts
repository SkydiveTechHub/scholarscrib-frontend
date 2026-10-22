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

// Opening the panel (or pressing "New chat") must not register a session: with
// nothing to resume the query settles on null, and the thread is created only
// when the student sends their first message.
test("opening with no thread to resume creates nothing", async () => {
  const options = tutorThreadQuery({ type: "general" }, undefined);
  const queryFn = options.queryFn as () => Promise<unknown>;
  assert.equal(await queryFn(), null);
});
