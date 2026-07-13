import assert from "node:assert/strict";
import test from "node:test";
import { bizforwardAdapter, waitForCookieOverlay } from "../dist/adapters/bizforward.js";
import { PROFILE_TEMPLATE } from "../dist/profile.js";

test("maps the portable profile to BizForward's public intake", async () => {
  const profile = structuredClone(PROFILE_TEMPLATE);
  profile.assets = {};
  const plan = await bizforwardAdapter.plan(profile);
  assert.deepEqual(plan.fields.slice(0, 4).map(({ field }) => field), ["Name", "E-Mail", "Fachgebiet", "Dein Profil"]);
  assert.equal(plan.fields.find(({ field }) => field === "Fachgebiet").value, "Software Development");
  assert.ok(plan.warnings.some((warning) => warning.includes("No CV")));
});

function cookiePage({ visible, waitFor }) {
  return {
    getByRole(role, options) {
      assert.equal(role, "button");
      assert.deepEqual(options, { name: "Speichern", exact: true });
      return {
        isVisible: async () => visible,
        waitFor
      };
    }
  };
}

test("continues when BizForward has no cookie overlay", async () => {
  await waitForCookieOverlay(cookiePage({ visible: false }), { consent: false, submit: false });
});

test("waits for a user to close BizForward's cookie overlay", async () => {
  let message = "";
  let waitOptions;
  await waitForCookieOverlay(cookiePage({
    visible: true,
    waitFor: async (options) => { waitOptions = options; }
  }), {
    consent: false,
    submit: false,
    onManualAction: async (value) => { message = value; }
  });
  assert.equal(message, "Choose Speichern in BizForward's cookie window. 1CV will continue.");
  assert.deepEqual(waitOptions, { state: "hidden", timeout: 120_000 });
});

test("fails clearly when the cookie overlay needs a non-interactive click", async () => {
  await assert.rejects(
    waitForCookieOverlay(cookiePage({ visible: true }), { consent: false, submit: false }),
    /Choose Speichern/
  );
});
