import assert from "node:assert/strict";
import test from "node:test";
import { bizforwardAdapter, dismissCookieOverlay } from "../dist/adapters/bizforward.js";
import { PROFILE_TEMPLATE } from "../dist/profile.js";

test("maps the portable profile to BizForward's public intake", async () => {
  const profile = structuredClone(PROFILE_TEMPLATE);
  profile.assets = {};
  const plan = await bizforwardAdapter.plan(profile);
  assert.deepEqual(plan.fields.slice(0, 4).map(({ field }) => field), ["Name", "E-Mail", "Fachgebiet", "Dein Profil"]);
  assert.equal(plan.fields.find(({ field }) => field === "Fachgebiet").value, "Software Development");
  assert.ok(plan.warnings.some((warning) => warning.includes("No CV")));
});

function cookiePage({ waitFor, click }) {
  return {
    getByRole(role, options) {
      assert.equal(role, "button");
      assert.deepEqual(options, { name: "Speichern", exact: true });
      return {
        click,
        waitFor
      };
    }
  };
}

test("continues when BizForward has no cookie overlay", async () => {
  await dismissCookieOverlay(cookiePage({
    waitFor: async () => { throw new Error("not visible"); }
  }));
});

test("automatically closes BizForward's delayed cookie overlay", async () => {
  const waits = [];
  let clickOptions;
  await dismissCookieOverlay(cookiePage({
    waitFor: async (options) => { waits.push(options); },
    click: async (options) => { clickOptions = options; }
  }));
  assert.deepEqual(waits, [
    { state: "visible", timeout: 2_000 },
    { state: "hidden", timeout: 5_000 }
  ]);
  assert.deepEqual(clickOptions, { delay: 120 });
});

test("fails clearly when BizForward keeps the cookie overlay open", async () => {
  let waits = 0;
  await assert.rejects(
    dismissCookieOverlay(cookiePage({
      waitFor: async () => {
        waits += 1;
        if (waits > 1) throw new Error("still visible");
      },
      click: async () => undefined
    })),
    /could not close/
  );
});
