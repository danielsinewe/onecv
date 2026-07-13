import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const run = promisify(execFile);
const cli = new URL("../dist/cli.js", import.meta.url);

test("creates a safe Codex onboarding prompt from LinkedIn", async () => {
  const { stdout } = await run(process.execPath, [cli.pathname, "start", "linkedin.com/in/danielsinewe", "--print"]);
  assert.match(stdout, /https:\/\/www\.linkedin\.com\/in\/danielsinewe/);
  assert.match(stdout, /without submitting anything/);
});

test("rejects non-profile LinkedIn URLs", async () => {
  await assert.rejects(
    run(process.execPath, [cli.pathname, "start", "https://linkedin.com/company/example", "--print"]),
    /public LinkedIn profile URL/
  );
});
