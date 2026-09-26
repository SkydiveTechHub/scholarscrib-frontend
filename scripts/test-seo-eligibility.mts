import { test } from "node:test";
import assert from "node:assert/strict";
import { PAPER_MIN_QUESTIONS, isPaperPageEligible } from "../src/lib/seo/eligibility";

test("a paper needs a real number of questions", () => {
  assert.equal(isPaperPageEligible({ publicQuestionCount: PAPER_MIN_QUESTIONS }), true);
  assert.equal(isPaperPageEligible({ publicQuestionCount: PAPER_MIN_QUESTIONS - 1 }), false);
});

// The provider/objective where-clause used to live here in question-scope.ts;
// with the DB out of Next it is now the backend's catalogue query, and these
// page-eligibility rules are the ones the public pages still run in this app.
