import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the Codex plugin and CLI versions aligned", async () => {
  const cli = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const plugin = JSON.parse(await readFile(new URL("../../plugins/1cv/.codex-plugin/plugin.json", import.meta.url), "utf8"));
  assert.equal(plugin.version, cli.version);
});
