import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describePreviewFailure, holdsBackSave } from "../src/lib/plan-preview-state";

// tsx compiles `src/lib/*.ts` as CommonJS but loads this file as an ES module, so a
// plain `import { ApiError }` here would be a different class from the one
// `isApiError` checks. Load it the way the library does.
const { ApiError } = createRequire(import.meta.url)(
  "../src/lib/api/errors",
) as typeof import("../src/lib/api/errors");

test("a server with no preview route is unsupported, whether it says 404 or 405", () => {
  // FastAPI answers an unknown POST route with 405 when a PATCH route shares the path,
  // and 404 otherwise; either way the body is {"detail": ...}, not {"error": ...}.
  assert.deepEqual(describePreviewFailure(new ApiError(405, {})), { kind: "unsupported" });
  assert.deepEqual(describePreviewFailure(new ApiError(404, {})), { kind: "unsupported" });
});

test("a failure with a message from our API shows that message", () => {
  assert.deepEqual(describePreviewFailure(new ApiError(400, { error: "Validation failed" })), {
    kind: "failed",
    message: "Validation failed",
  });
  assert.deepEqual(describePreviewFailure(new ApiError(500, { error: "Something went wrong." })), {
    kind: "failed",
    message: "Something went wrong.",
  });
});

test("a failure with no readable message still says what happened", () => {
  const failure = describePreviewFailure(new ApiError(502, {}));
  assert.equal(failure.kind, "failed");
  assert.match(failure.kind === "failed" ? failure.message : "", /error 502/);
});

test("a request that never got an answer is a network failure, not an unsupported server", () => {
  assert.deepEqual(describePreviewFailure(new Error("Network Error")), {
    kind: "failed",
    message: "Network error while checking this plan.",
  });
  assert.deepEqual(describePreviewFailure(undefined), {
    kind: "failed",
    message: "Network error while checking this plan.",
  });
});

test("saving is held back only when the server cannot store a timetable that would be sent", () => {
  const unsupported = { kind: "unsupported" } as const;
  assert.equal(holdsBackSave(unsupported, true), true);
  assert.equal(holdsBackSave(unsupported, false), false); // smart plan: nothing to lose
  assert.equal(holdsBackSave({ kind: "failed", message: "x" }, true), false); // the server will validate
  assert.equal(holdsBackSave(null, true), false);
});
