import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { nineAmAdapter, nineAmSearchTerms } from "../dist/adapters/nine-am.js";
import { PROFILE_TEMPLATE } from "../dist/profile.js";
import { loadPlatformState, platformStatePath, recordPrepared } from "../dist/state.js";
import { createSearchPage } from "./fixtures/search-browser.mjs";

const run = promisify(execFile);
const cli = new URL("../dist/cli.js", import.meta.url);
const browserLoader = new URL("./fixtures/search-browser.mjs", import.meta.url);

async function temporaryProfile(t) {
  const directory = await mkdtemp(join(tmpdir(), "onecv-nine-am-guards-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const profilePath = join(directory, "profile.json");
  const profile = structuredClone(PROFILE_TEMPLATE);
  profile.identity.fullName = "Synthetic User";
  profile.identity.email = "synthetic@example.com";
  profile.assets = {};
  await writeFile(profilePath, JSON.stringify(profile));
  return { profile, profilePath };
}

function offlineSearch(profilePath, outcome) {
  return run(process.execPath, ["--loader", browserLoader.href, cli.pathname, "search", "9am", "--profile", profilePath], {
    env: { ...process.env, ONECV_TEST_SEARCH_OUTCOME: outcome }
  });
}

test("maps a portable profile to 9am job matching", async () => {
  const profile = structuredClone(PROFILE_TEMPLATE);
  profile.professional.specialties = ["Growth", "AI"];
  profile.professional.skills = ["AI", "Node.js"];
  profile.preferences.rate = { amount: 120, currency: "EUR", unit: "hour" };
  assert.deepEqual(nineAmSearchTerms(profile), ["Growth", "AI", "Node.js"]);
  const plan = await nineAmAdapter.plan(profile);
  assert.equal(plan.fields.find(({ field }) => field === "Remote only").value, "Yes");
  assert.equal(plan.fields.find(({ field }) => field === "Minimum hourly rate").value, "EUR 120");
  assert.equal(plan.warnings.length, 0);
});

test("a clean user can discover and preview 9am without opening a browser", async () => {
  const directory = await mkdtemp(join(tmpdir(), "onecv-nine-am-"));
  const profilePath = join(directory, "profile.json");
  const profile = structuredClone(PROFILE_TEMPLATE);
  profile.identity.fullName = "New User";
  profile.identity.email = "new@example.com";
  profile.assets = {};
  await writeFile(profilePath, JSON.stringify(profile));

  const platforms = await run(process.execPath, [cli.pathname, "platforms"]);
  assert.match(platforms.stdout, /^9am\t9am\t/m);
  const preview = await run(process.execPath, [cli.pathname, "plan", "9am", "--profile", profilePath]);
  assert.match(preview.stdout, /Skills and keywords: Software Development/);
  assert.match(preview.stdout, /Languages: German, English/);
});

test("routes 9am to search instead of application submission", async () => {
  const directory = await mkdtemp(join(tmpdir(), "onecv-nine-am-route-"));
  const profilePath = join(directory, "profile.json");
  await writeFile(profilePath, JSON.stringify(PROFILE_TEMPLATE));
  await assert.rejects(
    run(process.execPath, [cli.pathname, "apply", "9am", "--profile", profilePath]),
    /uses "1cv search 9am"/
  );
});

test("failed search verification creates no preparation receipt", async (t) => {
  const { profilePath } = await temporaryProfile(t);
  await assert.rejects(offlineSearch(profilePath, "failure"), /Synthetic search verification failed/);
  assert.equal(await loadPlatformState("9am", profilePath), undefined);
});

test("failed search verification preserves the previous successful receipt", async (t) => {
  const { profile, profilePath } = await temporaryProfile(t);
  await recordPrepared("9am", profilePath, await nineAmAdapter.plan(profile), "2026-10-01T10:00:00.000Z");
  const statePath = platformStatePath("9am", profilePath);
  const previous = await readFile(statePath, "utf8");
  await assert.rejects(offlineSearch(profilePath, "failure"), /Synthetic search verification failed/);
  assert.equal(await readFile(statePath, "utf8"), previous);
});

test("successful search verification records preparation without submission", async (t) => {
  const { profilePath } = await temporaryProfile(t);
  const result = await offlineSearch(profilePath, "success");
  assert.match(result.stdout, /9am search prepared — 3 Matching Jobs/);
  const state = await loadPlatformState("9am", profilePath);
  assert.ok(state.lastPrepared);
  assert.equal(state.lastSubmitted, undefined);
});

for (const [currency, unit, amount, supported, warning] of [
  ["EUR", "hour", 120, true, undefined],
  ["eur", "hour", 90, true, undefined],
  ["USD", "hour", 120, false, /non-EUR rate.*unchanged/],
  ["JPY", "hour", 15000, false, /non-EUR rate.*unchanged/],
  ["EUR", "day", 800, false, /daily rate.*unchanged/],
  ["USD", "day", 800, false, /daily rate.*unchanged/]
]) {
  test(`${currency} per ${unit} ${supported ? "sets" : "leaves"} the EUR hourly filter`, async () => {
    const profile = structuredClone(PROFILE_TEMPLATE);
    profile.preferences.rate = { amount, currency, unit };
    const plan = await nineAmAdapter.plan(profile);
    assert.equal(plan.fields.find(({ field }) => field === "Minimum hourly rate").value, supported ? `EUR ${amount}` : "");
    if (warning) assert.match(plan.warnings.join("\n"), warning);
    else assert.deepEqual(plan.warnings, []);
    const page = createSearchPage();
    await nineAmAdapter.fill(page, profile, { consent: false, headless: true, submit: false });
    assert.equal(page.actions.filter((action) => action === "rate:open").length, supported ? 1 : 0);
    assert.equal(page.actions.filter((action) => action === "Home").length, supported ? 1 : 0);
    assert.equal(page.actions.filter((action) => action === "ArrowRight").length, supported ? amount : 0);
  });
}
