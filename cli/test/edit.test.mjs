import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { bizforwardAdapter } from "../dist/adapters/bizforward.js";
import { loadProfile } from "../dist/profile.js";
import { recordPrepared } from "../dist/state.js";

const execFileAsync = promisify(execFile);
const cli = resolve("dist/cli.js");

async function run(directory, args) {
  return execFileAsync(process.execPath, [cli, ...args], { cwd: directory });
}

test("edits a profile without manual JSON and reports BizForward changes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "onecv-edit-"));
  const profilePath = join(directory, "profile.json");
  await run(directory, [
    "init", "--profile", profilePath,
    "--name", "New User",
    "--email", "new@example.com",
    "--specialty", "Software Development",
    "--profile-url", "https://linkedin.com/in/new-user"
  ]);

  const initialStatus = await run(directory, ["status", "bizforward", "--profile", profilePath]);
  assert.match(initialStatus.stdout, /BizForward: not prepared\./);
  await recordPrepared(
    "bizforward",
    profilePath,
    await bizforwardAdapter.plan(await loadProfile(profilePath)),
    "2026-07-13T10:00:00.000Z"
  );

  await run(directory, [
    "edit", "--profile", profilePath,
    "--email", "changed@example.com",
    "--specialty", "CRM, Software Development",
    "--profile-url", "https://example.com/profile",
    "--cv", "/tmp/new-user-cv.pdf"
  ]);
  const profile = JSON.parse(await readFile(profilePath, "utf8"));
  assert.equal(profile.identity.email, "changed@example.com");
  assert.deepEqual(profile.identity.links, { website: "https://example.com/profile" });
  assert.deepEqual(profile.professional.specialties, ["CRM", "Software Development"]);
  assert.equal(profile.assets.cv, "/tmp/new-user-cv.pdf");

  const diff = await run(directory, ["diff", "bizforward", "--profile", profilePath]);
  assert.match(diff.stdout, /BizForward: 4 changed fields\./);
  assert.match(diff.stdout, /E-Mail: new@example\.com → changed@example\.com/);
  assert.match(diff.stdout, /Fachgebiet: Software Development → CRM, Software Development/);
  const status = await run(directory, ["status", "bizforward", "--profile", profilePath]);
  assert.match(status.stdout, /BizForward: prepared 2026-07-13T10:00:00\.000Z\. Nothing submitted from this fill\./);
  assert.match(status.stdout, /4 profile changes since the last fill\./);

  await run(directory, ["edit", "--profile", profilePath, "--clear-cv"]);
  const withoutCv = JSON.parse(await readFile(profilePath, "utf8"));
  assert.deepEqual(withoutCv.assets, {});
});
