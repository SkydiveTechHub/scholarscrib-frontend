import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../src/components/tutor/escape-html";

test("escapes markup so the pre-KaTeX math fallback cannot inject HTML", () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)">&'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;",
  );
});

test("leaves ordinary maths source untouched", () => {
  assert.equal(escapeHtml("x^2 + 3 = 7"), "x^2 + 3 = 7");
});
