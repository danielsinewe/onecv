import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("onboards a user without repository-local data", async () => {
  const directory = await mkdtemp(join(tmpdir(), "onecv-clean-room-"));
  const profilePath = join(directory, "profile.json");
  const cli = resolve("dist/cli.js");
  const { stdout } = await execFileAsync(process.execPath, [
    cli,
    "init",
    "--profile", profilePath,
    "--name", "Anonymous User",
    "--email", "user@example.com",
    "--specialty", "Software Development",
    "--profile-url", "https://linkedin.com/in/anonymous-user"
  ], { cwd: directory });

  const profile = JSON.parse(await readFile(profilePath, "utf8"));
  assert.equal(profile.identity.fullName, "Anonymous User");
  assert.equal(profile.identity.links.linkedin, "https://linkedin.com/in/anonymous-user");
  assert.deepEqual(profile.assets, {});
  assert.match(stdout, /Next: 1cv plan bizforward/);
});
