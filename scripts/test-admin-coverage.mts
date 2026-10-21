import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../src/lib/api/errors";
import {
  exportErrorMessage,
  exportParams,
  fillBadge,
  filenameFromDisposition,
  groupPapersByExam,
  listHref,
  optionEntries,
  paperKey,
  resolveTab,
  tabHref,
} from "../src/lib/admin-coverage";

const params = (query: string) => new URLSearchParams(query);

test("the coverage tab is the default", () => {
  assert.equal(resolveTab(params("")), "coverage");
});

test("an explicit tab wins", () => {
  assert.equal(resolveTab(params("tab=all")), "all");
  assert.equal(resolveTab(params("tab=coverage&subjectId=s1")), "coverage");
});

test("a link carrying list filters and no tab opens the list", () => {
  for (const q of ["subjectId=s1", "examType=JAMB", "examYear=2019", "difficulty=BASIC"]) {
    assert.equal(resolveTab(params(q)), "all", q);
  }
});

test("an unknown tab value falls back as if absent", () => {
  assert.equal(resolveTab(params("tab=bogus")), "coverage");
  assert.equal(resolveTab(params("tab=bogus&examYear=2019")), "all");
});

test("hrefs", () => {
  assert.equal(tabHref("coverage"), "/admin/questions?tab=coverage");
  assert.equal(
    listHref({ subjectId: "s 1", examType: "JAMB", examYear: 2019 }),
    "/admin/questions?tab=all&subjectId=s+1&examType=JAMB&examYear=2019",
  );
});

test("paperKey is stable per subject, exam and year", () => {
  assert.equal(paperKey("s1", "JAMB", 2019), "s1|JAMB|2019");
});

test("fillBadge flags only papers that are not complete", () => {
  assert.deepEqual(fillBadge("PENDING"), { label: "Filling", tone: "amber" });
  assert.deepEqual(fillBadge("FAILED"), { label: "Fetch failed", tone: "red" });
  assert.equal(fillBadge("SATURATED"), null);
  assert.equal(fillBadge(null), null);
});

test("filenameFromDisposition reads quoted and bare names", () => {
  assert.equal(
    filenameFromDisposition('attachment; filename="maths-JAMB-2019.csv"', "x.csv"),
    "maths-JAMB-2019.csv",
  );
  assert.equal(filenameFromDisposition("attachment; filename=maths.zip", "x.csv"), "maths.zip");
});

test("filenameFromDisposition falls back when absent or unusable", () => {
  assert.equal(filenameFromDisposition(undefined, "export.csv"), "export.csv");
  assert.equal(filenameFromDisposition("attachment", "export.csv"), "export.csv");
  assert.equal(filenameFromDisposition('attachment; filename=""', "export.csv"), "export.csv");
});

test("filenameFromDisposition never lets a path through", () => {
  assert.equal(
    filenameFromDisposition('attachment; filename="../../etc/passwd"', "export.csv"),
    "passwd",
  );
  assert.equal(filenameFromDisposition('attachment; filename="a\\b.csv"', "x.csv"), "b.csv");
});

test("exportParams sends only what was chosen", () => {
  assert.deepEqual(exportParams({ subjectId: "s1", format: "csv" }), {
    subjectId: "s1",
    format: "csv",
  });
  assert.deepEqual(
    exportParams({ subjectId: "s1", examType: "JAMB", examYear: 2019, format: "json" }),
    { subjectId: "s1", examType: "JAMB", examYear: "2019", format: "json" },
  );
});

test("optionEntries copes with every shape the options column can hold", () => {
  assert.deepEqual(optionEntries({ A: "one", B: "two" }), [
    ["A", "one"],
    ["B", "two"],
  ]);
  assert.deepEqual(optionEntries({ A: 1, B: null }), [
    ["A", "1"],
    ["B", ""],
  ]);
  assert.deepEqual(optionEntries(null), []);
  assert.deepEqual(optionEntries("free text"), []);
  assert.deepEqual(optionEntries(["x", "y"]), []);
});

test("a refused download shows the reason the backend gave", () => {
  const refused = new ApiError(400, {
    error: "Too many questions to export at once. Choose an exam type or year.",
  });
  assert.equal(
    exportErrorMessage(refused),
    "Too many questions to export at once. Choose an exam type or year.",
  );
});

test("a download that never reached the server says so, not axios' wording", () => {
  assert.equal(
    exportErrorMessage(new Error("Network Error")),
    "Could not reach the server. Nothing was downloaded.",
  );
  assert.equal(
    exportErrorMessage("nonsense"),
    "Could not reach the server. Nothing was downloaded.",
  );
});

test("groupPapersByExam groups by exam in a fixed order and sums counts", () => {
  const paper = (examType: string, examYear: number, count: number) => ({
    examType,
    examYear,
    count,
    fetchStatus: null,
  });
  const groups = groupPapersByExam([
    paper("NECO", 2022, 10),
    paper("ZZEXAM", 2021, 1),
    paper("JAMB", 2023, 45),
    paper("WAEC", 2023, 40),
    paper("JAMB", 2022, 45),
    paper("WAEC", 2021, 30),
  ]);
  assert.deepEqual(
    groups.map((g) => [g.examType, g.count, g.papers.map((p) => p.examYear)]),
    [
      ["WAEC", 70, [2023, 2021]],
      ["JAMB", 90, [2023, 2022]],
      ["NECO", 10, [2022]],
      ["ZZEXAM", 1, [2021]],
    ],
  );
  assert.deepEqual(groupPapersByExam([]), []);
});
