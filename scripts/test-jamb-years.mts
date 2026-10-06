import { test } from "node:test";
import assert from "node:assert/strict";
import { sharedYears } from "../src/lib/jamb-cbt";

const english = { years: [2019, 2016, 2011, 2010, 2004] };

test("only years every subject has a full paper for, newest first", () => {
  assert.deepEqual(
    sharedYears([
      english,
      { years: [2004, 2010, 2011] },
      { years: [2011, 2010, 2009, 2004] },
      { years: [2004, 2011, 2010, 2003] },
    ]),
    [2011, 2010, 2004],
  );
});

test("no shared year is an empty list, not a guess", () => {
  assert.deepEqual(sharedYears([english, { years: [2009] }]), []);
  assert.deepEqual(sharedYears([english, { years: [] }]), []);
  assert.deepEqual(sharedYears([]), []);
});
