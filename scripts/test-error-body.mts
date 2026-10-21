import { test } from "node:test";
import assert from "node:assert/strict";
import { readErrorBody } from "../src/lib/api/error-body";

test("a JSON object body passes through", async () => {
  assert.deepEqual(await readErrorBody({ error: "nope" }), { error: "nope" });
});

test("a plain string body becomes the error text", async () => {
  assert.deepEqual(await readErrorBody("gateway down"), { error: "gateway down" });
  assert.deepEqual(await readErrorBody(""), { error: undefined });
  assert.deepEqual(await readErrorBody(undefined), { error: undefined });
});

// A download is requested with responseType "blob", so the backend's JSON
// refusal ("too many questions", "no questions to export") arrives as a Blob.
test("a blob holding JSON is read back as the error body", async () => {
  const blob = new Blob([JSON.stringify({ error: "No questions to export" })], {
    type: "application/json",
  });
  assert.deepEqual(await readErrorBody(blob), { error: "No questions to export" });
});

test("a blob that is not JSON yields an empty body", async () => {
  assert.deepEqual(await readErrorBody(new Blob(["<html>502</html>"])), {});
});
