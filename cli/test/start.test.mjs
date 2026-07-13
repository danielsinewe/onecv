import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const run = promisify(execFile);
const cli = new URL("../dist/cli.js", import.meta.url);

test("creates a safe Codex desktop handoff from LinkedIn", async () => {
  const { stdout } = await run(process.execPath, [cli.pathname, "start", "linkedin.com/in/danielsinewe", "--print"]);
  const link = new URL(stdout.trim());
  assert.equal(link.protocol, "codex:");
  assert.equal(link.host, "new");
  assert.match(link.searchParams.get("prompt"), /https:\/\/www\.linkedin\.com\/in\/danielsinewe/);
  assert.match(link.searchParams.get("prompt"), /Codex desktop task/);
  assert.match(link.searchParams.get("prompt"), /without submitting anything/);
  assert.ok(link.searchParams.get("path")?.endsWith("/.1cv"));
});

test("rejects non-profile LinkedIn URLs", async () => {
  await assert.rejects(
    run(process.execPath, [cli.pathname, "start", "https://linkedin.com/company/example", "--print"]),
    /public LinkedIn profile URL/
  );
});
