import { test } from "node:test";
import assert from "node:assert/strict";
import {
  distinctIdFromPostHogCookie,
  historyTargetChangesPath,
  isAdminAnalyticsPath,
  studentPersonProperties,
  withoutAdminCapture,
} from "../src/lib/posthog-privacy";

test("student person properties are only class, track, state, and tier", () => {
  const props = studentPersonProperties({
    classLevel: "SS3",
    track: "science",
    state: "Lagos",
    tier: "free",
  });
  assert.deepEqual(Object.keys(props).sort(), ["class_level", "state", "tier", "track"]);
  assert.equal(props.class_level, "SS3");
  assert.equal("email" in props, false);
  assert.deepEqual(
    studentPersonProperties({ classLevel: null, track: "", state: undefined, tier: null }),
    {},
  );
});

test("admin paths are dropped and student paths are kept", () => {
  assert.equal(isAdminAnalyticsPath("/admin"), true);
  assert.equal(isAdminAnalyticsPath("/admin/students"), true);
  assert.equal(isAdminAnalyticsPath("/administrator"), false);

  assert.equal(
    withoutAdminCapture({
      uuid: "1",
      event: "$pageview",
      properties: { $pathname: "/admin/students" },
    }),
    null,
  );
  assert.equal(
    withoutAdminCapture({
      uuid: "1",
      event: "$pageview",
      properties: { $current_url: "http://localhost:3000/admin?x=1" },
    }),
    null,
  );
  assert.ok(
    withoutAdminCapture({
      uuid: "1",
      event: "$pageview",
      properties: {
        $pathname: "/dashboard",
        $current_url: "http://localhost:3000/dashboard",
      },
    }),
  );
});

test("a history change records a page leave only when the path changes", () => {
  const here = "https://scholarscrib.vercel.app/dashboard";
  assert.equal(historyTargetChangesPath("/study-plan", here), true);
  assert.equal(historyTargetChangesPath("/dashboard?tab=1", here), false);
  assert.equal(historyTargetChangesPath(null, here), false);
});

test("distinct id comes from the PostHog cookie and nowhere else", () => {
  const cookie =
    "a=1; ph_phc_abc_posthog=" +
    encodeURIComponent(JSON.stringify({ distinct_id: "user-1" }));
  assert.equal(distinctIdFromPostHogCookie(cookie), "user-1");
  assert.equal(distinctIdFromPostHogCookie("other=1"), undefined);
  assert.equal(distinctIdFromPostHogCookie(undefined), undefined);
});
