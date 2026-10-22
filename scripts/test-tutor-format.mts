import { test } from "node:test";
import assert from "node:assert/strict";
import { holdBackPartial, prepareTutorMarkdown } from "../src/lib/tutor/format";

test("converts paren and bracket maths to dollar delimiters", () => {
  assert.equal(
    prepareTutorMarkdown("Valency is \\(n\\) and \\[x^2\\]", false),
    "Valency is $n$ and $$x^2$$",
  );
});

test("puts a glued heading on its own block", () => {
  assert.equal(
    prepareTutorMarkdown("a charge.### Key Points", false),
    "a charge.\n\n### Key Points",
  );
  assert.equal(prepareTutorMarkdown("C# is fine", false), "C# is fine");
});

test("streaming holds back an unfinished table row, bare marker and open maths", () => {
  assert.equal(holdBackPartial("Intro\n| Radical | For"), "Intro\n");
  assert.equal(holdBackPartial("Intro\n###"), "Intro\n");
  assert.equal(holdBackPartial("Intro\n- "), "Intro\n");
  assert.equal(holdBackPartial("Use $\\frac{a"), "Use ");
  assert.equal(holdBackPartial("So **key"), "So key");
});

test("streaming leaves finished lines and plain text alone", () => {
  const table = "| a | b |\n|---|---|\n";
  assert.equal(holdBackPartial(table), table);
  const prose = "Hello **bold** and $x$";
  assert.equal(holdBackPartial(prose), prose);
});
