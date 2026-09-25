import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PAPER_MIN_QUESTIONS,
  TOPIC_MIN_QUESTIONS,
  isPaperPageEligible,
  isTopicPageEligible,
} from "../src/lib/seo/eligibility";

const topic = (over: Partial<Parameters<typeof isTopicPageEligible>[0]> = {}) => ({
  description: "Cells are the basic unit of life.",
  subtopicCount: 3,
  publicQuestionCount: 5,
  ...over,
});

test("a topic with prose and enough questions is eligible", () => {
  assert.equal(isTopicPageEligible(topic()), true);
});

test("subtopics substitute for a missing description", () => {
  assert.equal(isTopicPageEligible(topic({ description: null, subtopicCount: 2 })), true);
  assert.equal(isTopicPageEligible(topic({ description: "   ", subtopicCount: 2 })), true);
});

test("no prose and too few subtopics is not eligible", () => {
  assert.equal(isTopicPageEligible(topic({ description: null, subtopicCount: 1 })), false);
});

test("questions are required even when the prose is good", () => {
  // A topic page with nothing to practise is a brochure, and a few hundred
  // brochures is what a doorway-page classification looks like.
  assert.equal(
    isTopicPageEligible(topic({ publicQuestionCount: TOPIC_MIN_QUESTIONS - 1 })),
    false,
  );
  assert.equal(isTopicPageEligible(topic({ publicQuestionCount: 0 })), false);
});

test("the topic threshold is inclusive at the boundary", () => {
  assert.equal(isTopicPageEligible(topic({ publicQuestionCount: TOPIC_MIN_QUESTIONS })), true);
});

test("a paper needs a real number of questions", () => {
  assert.equal(isPaperPageEligible({ publicQuestionCount: PAPER_MIN_QUESTIONS }), true);
  assert.equal(isPaperPageEligible({ publicQuestionCount: PAPER_MIN_QUESTIONS - 1 }), false);
});

// The provider/objective where-clause used to live here in question-scope.ts;
// with the DB out of Next it is now the backend's catalogue query, and these
// page-eligibility rules are the ones the public pages still run in this app.
