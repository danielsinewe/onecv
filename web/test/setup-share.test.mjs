import assert from "node:assert/strict";
import test from "node:test";
import { mountSetupShare, publicSetupLink } from "../setup-share.js";

function page(clipboard) {
  const elements = Object.fromEntries(["copy-setup-link", "setup-share-status", "setup-share-fallback", "public-setup-link"].map((name) => [name, {
    disabled: false, hidden: name === "setup-share-fallback", value: "", textContent: "",
    addEventListener(event, handler) { this[event] = handler; },
    focus() { this.focused = true; }, select() { this.selected = true; },
  }]));
  const events = [];
  mountSetupShare({
    document: {
      URL: "https://1cv.app/?linkedin=https://linkedin.com/in/private-person&email=private@example.invalid#private",
      querySelector: (selector) => elements[selector.slice(6, -1)],
    },
    navigator: { clipboard },
    trackLaunchEvent: (name) => events.push(name),
  });
  return { elements, events, click: () => elements["copy-setup-link"].click() };
}

test("public setup URL has only the fixed referral labels and public preview destination", () => {
  const url = new URL(publicSetupLink);
  assert.equal(url.origin + url.pathname, "https://1cv.app/");
  assert.equal(url.hash, "#setup-preview");
  assert.deepEqual([...url.searchParams], [
    ["utm_source", "shared_walkthrough"], ["utm_medium", "referral"],
    ["utm_campaign", "launch_2026_11"], ["utm_content", "1cv_setup_share"],
  ]);
});

test("a copy is voluntary, contains no incoming private data, and waits for the actual clipboard result", async () => {
  const writes = [];
  let resolve;
  const p = page({ writeText: (value) => { writes.push(value); return new Promise((done) => { resolve = done; }); } });
  assert.deepEqual(writes, []);
  assert.deepEqual(p.events, []);
  const pending = p.click();
  await p.click();
  assert.deepEqual(writes, [publicSetupLink]);
  assert.equal(p.elements["copy-setup-link"].disabled, true);
  assert.equal(p.elements["setup-share-status"].textContent, "");
  assert.deepEqual(p.events, []);
  resolve(); await pending;
  assert.equal(p.elements["copy-setup-link"].disabled, false);
  assert.equal(p.elements["setup-share-status"].textContent, "Public setup link copied.");
  assert.deepEqual(p.events, ["onecv_setup_link_copied"]);
});

test("denied clipboard exposes the same selectable public URL and permits a successful retry", async () => {
  let denied = true;
  const p = page({ writeText: async () => { if (denied) throw new Error("Denied"); } });
  await p.click();
  assert.equal(p.elements["setup-share-fallback"].hidden, false);
  assert.equal(p.elements["public-setup-link"].value, publicSetupLink);
  assert.equal(p.elements["public-setup-link"].selected, true);
  assert.equal(p.elements["public-setup-link"].focused, true);
  assert.match(p.elements["setup-share-status"].textContent, /manually/);
  assert.deepEqual(p.events, []);
  denied = false; await p.click();
  assert.equal(p.elements["setup-share-fallback"].hidden, true);
  assert.deepEqual(p.events, ["onecv_setup_link_copied"]);
});

test("missing clipboard API offers manual recovery without claiming a copy", async () => {
  const p = page();
  await p.click();
  assert.equal(p.elements["setup-share-fallback"].hidden, false);
  assert.equal(p.elements["copy-setup-link"].disabled, false);
  assert.deepEqual(p.events, []);
});
