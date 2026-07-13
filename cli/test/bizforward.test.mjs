import assert from "node:assert/strict";
import test from "node:test";
import { bizforwardAdapter } from "../dist/adapters/bizforward.js";
import { PROFILE_TEMPLATE } from "../dist/profile.js";

test("maps the portable profile to BizForward's public intake", async () => {
  const profile = structuredClone(PROFILE_TEMPLATE);
  profile.assets = {};
  const plan = await bizforwardAdapter.plan(profile);
  assert.deepEqual(plan.fields.slice(0, 4).map(({ field }) => field), ["Name", "E-Mail", "Fachgebiet", "Dein Profil"]);
  assert.equal(plan.fields.find(({ field }) => field === "Fachgebiet").value, "Software Development");
  assert.ok(plan.warnings.some((warning) => warning.includes("No CV")));
});
