import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { nineAmAdapter, nineAmSearchTerms } from "../dist/adapters/nine-am.js";
import { PROFILE_TEMPLATE } from "../dist/profile.js";

const run = promisify(execFile);
const cli = new URL("../dist/cli.js", import.meta.url);

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
