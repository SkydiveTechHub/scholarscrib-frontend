import { test } from "node:test";
import assert from "node:assert/strict";
import { MASTERY_LABEL_HELP, MASTERY_RULE } from "../src/lib/mastery-labels";

test("every topic standing label is explained", () => {
  assert.deepEqual(
    MASTERY_LABEL_HELP.map((r) => r.label),
    ["Strong", "Normal", "Weak", "Emerging"],
  );
});

test("the mastery rule states the real evidence needed", () => {
  assert.match(MASTERY_RULE, /70%/);
  assert.match(MASTERY_RULE, /7 questions/);
  assert.match(MASTERY_RULE, /2 different days/);
});

test("explanations are neutral, not labelling the student", () => {
  const text = MASTERY_LABEL_HELP.map((r) => r.meaning).join(" ");
  assert.doesNotMatch(text, /\b(bad|poor|failing|lazy|weak student)\b/i);
  const weak = MASTERY_LABEL_HELP.find((r) => r.label === "Weak");
  assert.match(weak?.meaning ?? "", /practice|more/i);
});
