import { test } from "node:test";
import assert from "node:assert/strict";
import { MATERIAL_TYPES, MATERIAL_LABELS } from "../src/lib/materials";
import { requiresUpload } from "../src/lib/admin-material";

test("there are exactly four material types", () => {
  assert.deepEqual([...MATERIAL_TYPES], ["PDF", "IMAGE", "VIDEO", "LINK"]);
});

test("every type has a display label", () => {
  // "PDF" must not render as "Pdf", which is what a CSS capitalize would do.
  assert.equal(MATERIAL_LABELS.PDF, "PDF");
  assert.equal(MATERIAL_LABELS.IMAGE, "Image");
  assert.equal(MATERIAL_LABELS.VIDEO, "Video");
  assert.equal(MATERIAL_LABELS.LINK, "Link");
});

test("files are uploaded, videos and links are pasted", () => {
  assert.equal(requiresUpload("PDF"), true);
  assert.equal(requiresUpload("IMAGE"), true);
  assert.equal(requiresUpload("VIDEO"), false);
  assert.equal(requiresUpload("LINK"), false);
});
