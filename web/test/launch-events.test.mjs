import assert from "node:assert/strict";
import test from "node:test";
import { createLaunchTracker } from "../launch-events.js";

function tracker({ consent = "granted", search = "", hostname = "1cv.app", navigator = {}, fail = false } = {}) {
  const events = [];
  let choice = consent;
  const track = createLaunchTracker({
    getConsent: () => choice,
    emit: (...event) => { if (fail) throw new Error("blocked"); events.push(event); },
    location: { hostname, search },
    navigator,
  });
  return { track, events, consent: (value) => { choice = value; } };
}

test("handoff events require current opt-in and do not replay pre-consent actions", () => {
  const t = tracker({ consent: null });
  assert.equal(t.track("onecv_command_generated"), false);
  t.consent("denied");
  assert.equal(t.track("onecv_command_generated"), false);
  t.consent("granted");
  assert.equal(t.events.length, 0);
  assert.equal(t.track("onecv_command_generated"), true);
  assert.equal(t.track("onecv_command_generated"), false);
  t.consent("denied");
  assert.equal(t.track("onecv_command_copied"), false);
  assert.equal(t.events.length, 1);
});

test("only fixed launch labels are emitted, never profile URLs or arbitrary query values", () => {
  const t = tracker({ search: "?utm_source=producthunt&utm_campaign=launch_2026_11&utm_content=1cv_launch&linkedin=https://linkedin.com/in/private&email=private@example.com" });
  t.track("onecv_command_copied");
  assert.deepEqual(t.events, [["onecv_command_copied", {
    launch_source: "producthunt", launch_campaign: "launch_2026_11", launch_placement: "1cv_launch",
  }]]);
  const u = tracker({ search: "?utm_source=private&utm_campaign=private&utm_content=private" });
  u.track("onecv_command_generated");
  assert.deepEqual(u.events[0][1], { launch_source: "other", launch_campaign: "other", launch_placement: "other" });
});

test("privacy signals, QA and preview hosts suppress launch events", () => {
  for (const options of [
    { navigator: { doNotTrack: "1" } }, { navigator: { doNotTrack: "yes" } },
    { navigator: { globalPrivacyControl: true } },
    { search: "?onecv_qa=1" }, { search: "?launch_qa=1" },
    { search: "?utm_source=github&utm_content=beta6_quickstart&onecv_qa=1" },
    { hostname: "localhost" }, { hostname: "onecv-preview.vercel.app" },
  ]) {
    const t = tracker(options);
    assert.equal(t.track("onecv_command_generated"), false);
    assert.equal(t.events.length, 0);
  }
});

test("unknown events and blocked analytics never interrupt setup", () => {
  const t = tracker();
  assert.equal(t.track("profile_created"), false);
  assert.equal(t.track("onecv_setup_preview_completed"), true);
  const blocked = tracker({ fail: true });
  assert.equal(blocked.track("onecv_command_copied"), false);
});


test("GitHub release handoffs keep only the registered bounded labels", () => {
  const t = tracker({ search: "?utm_source=github&utm_medium=release&utm_campaign=launch_2026_11&utm_content=beta6_quickstart&profile=private-profile&email=private@example.invalid" });
  assert.equal(t.track("onecv_command_generated"), true);
  assert.deepEqual(t.events, [["onecv_command_generated", {
    launch_source: "github", launch_campaign: "launch_2026_11", launch_placement: "beta6_quickstart",
  }]]);
});

test("shared setup handoffs preserve fixed labels without exporting incoming private values", () => {
  const t = tracker({ search: "?utm_source=shared_walkthrough&utm_medium=referral&utm_campaign=launch_2026_11&utm_content=1cv_setup_share&linkedin=private-profile&email=private@example.invalid" });
  assert.equal(t.track("onecv_command_generated"), true);
  assert.equal(t.track("onecv_setup_link_copied"), true);
  assert.equal(t.track("onecv_setup_link_copied"), false);
  assert.deepEqual(t.events.map(([name, labels]) => ({ name, labels })), [
    { name: "onecv_command_generated", labels: { launch_source: "shared_walkthrough", launch_campaign: "launch_2026_11", launch_placement: "1cv_setup_share" } },
    { name: "onecv_setup_link_copied", labels: { launch_source: "shared_walkthrough", launch_campaign: "launch_2026_11", launch_placement: "1cv_setup_share" } },
  ]);
  for (const options of [
    { consent: null }, { consent: "denied" }, { navigator: { doNotTrack: "1" } },
    { navigator: { globalPrivacyControl: true } }, { search: "?onecv_qa=1" },
    { search: "?launch_qa=1" }, { hostname: "localhost" },
  ]) {
    const blocked = tracker(options);
    assert.equal(blocked.track("onecv_setup_link_copied"), false);
    assert.deepEqual(blocked.events, []);
  }
});
