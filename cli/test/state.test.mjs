import assert from "node:assert/strict";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  diffPlan,
  loadPlatformState,
  platformStatePath,
  recordPrepared,
  recordSubmitted
} from "../dist/state.js";

const plan = {
  platform: "BizForward",
  url: "https://bizforward.de/freelancer-sign-up/",
  fields: [
    { field: "Name", value: "New User", required: true },
    { field: "E-Mail", value: "new@example.com", required: true }
  ],
  warnings: []
};

test("records verified fills locally and detects later profile changes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "onecv-state-"));
  const profilePath = join(directory, "profile.json");

  assert.equal(await loadPlatformState("bizforward", profilePath), undefined);
  assert.deepEqual(diffPlan(plan, undefined), []);

  const preparedAt = "2026-07-13T10:00:00.000Z";
  await recordPrepared("bizforward", profilePath, plan, preparedAt);
  const prepared = await loadPlatformState("bizforward", profilePath);
  assert.equal(prepared.lastPrepared.at, preparedAt);
  assert.equal(prepared.lastSubmitted, undefined);
  assert.deepEqual(diffPlan(plan, prepared), []);

  const changed = {
    ...plan,
    fields: plan.fields.map((field) => field.field === "E-Mail"
      ? { ...field, value: "changed@example.com" }
      : field)
  };
  assert.deepEqual(diffPlan(changed, prepared), [{
    field: "E-Mail",
    before: "new@example.com",
    after: "changed@example.com"
  }]);

  const mode = (await stat(platformStatePath("bizforward", profilePath))).mode & 0o777;
  assert.equal(mode, 0o600);
});

test("records submission only with its visible confirmation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "onecv-state-"));
  const profilePath = join(directory, "profile.json");
  const submittedAt = "2026-07-13T11:00:00.000Z";

  await recordSubmitted("bizforward", profilePath, plan, "Thanks for contacting us.", submittedAt);
  const state = await loadPlatformState("bizforward", profilePath);
  assert.equal(state.lastPrepared.at, submittedAt);
  assert.equal(state.lastSubmitted.at, submittedAt);
  assert.equal(state.lastSubmitted.confirmation, "Thanks for contacting us.");
});
