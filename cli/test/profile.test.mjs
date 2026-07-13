import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createProfile, loadProfile, preferredProfileUrl } from "../dist/profile.js";

test("creates and validates a private local profile", async () => {
  const directory = await mkdtemp(join(tmpdir(), "onecv-"));
  const path = join(directory, "profile.json");
  await createProfile(path);
  const profile = await loadProfile(path);
  assert.equal(profile.version, 1);
  assert.equal(preferredProfileUrl(profile), "https://www.linkedin.com/in/your-profile");
  assert.match(await readFile(path, "utf8"), /Your name/);
});

test("rejects invalid profiles with actionable field paths", async () => {
  const directory = await mkdtemp(join(tmpdir(), "onecv-"));
  const path = join(directory, "profile.json");
  await writeFile(path, JSON.stringify({ version: 1, identity: {} }));
  await assert.rejects(() => loadProfile(path), /identity\.fullName/);
});
