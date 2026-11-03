import assert from "node:assert/strict";
import test from "node:test";
import { ahrefsConsentKey, createPublicAhrefs, publicPageUrl } from "../public-ahrefs.js";

function browser({ href = "https://1cv.app/privacy/?email=fixture@example.invalid#private", navigator = {}, stored = {}, blocked = false } = {}) {
  const storage = new Map(Object.entries(stored));
  const frames = [];
  const events = new Map();
  const win = {
    location: { href }, navigator,
    localStorage: {
      getItem(key) { if (blocked) throw Error("blocked"); return storage.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw Error("blocked"); storage.set(key, value); },
    },
    document: {
      createElement(tag) {
        assert.equal(tag, "iframe");
        return { attrs: {}, setAttribute(key, value) { this.attrs[key] = value; }, remove() { const i = frames.indexOf(this); if (i >= 0) frames.splice(i, 1); } };
      },
      body: { append(frame) { frames.push(frame); } },
    },
    addEventListener(name, fn) { events.set(name, fn); },
    removeEventListener(name) { events.delete(name); },
  };
  return { win, frames, storage, events, tracker: createPublicAhrefs(win) };
}

test("only canonical public paths reach analytics; query and fragment values never do", () => {
  assert.equal(publicPageUrl("https://1cv.app/privacy/?linkedin=private&email=fixture@example.invalid#private"), "https://1cv.app/privacy/");
  for (const href of ["http://1cv.app/", "https://preview.vercel.app/", "https://user:pass@1cv.app/", "https://1cv.app/profile/secret", "https://1cv.app/start", "https://1cv.app/privacy/extra", "invalid"]) assert.equal(publicPageUrl(href), null);
});

test("no native tracker before explicit choice; existing Google grant is not inherited", () => {
  const b = browser({ stored: { onecv_google_analytics_consent: "granted" } });
  b.tracker.sync();
  assert.equal(b.frames.length, 0);
  assert.equal(b.tracker.choice(), null);
  b.tracker.setChoice("denied");
  assert.equal(b.frames.length, 0);
  assert.equal(b.storage.get("onecv_google_analytics_consent"), "granted");
});

test("grant creates one isolated sanitized document and withdrawal destroys it", () => {
  const b = browser();
  b.tracker.setChoice("granted");
  assert.equal(b.frames.length, 1);
  const frame = b.frames[0];
  assert.equal(frame.hidden, true);
  assert.equal(frame.attrs.sandbox, "allow-scripts");
  assert.equal(frame.referrerPolicy, "no-referrer");
  assert.match(frame.srcdoc, /<title>1CV public website<\/title>/);
  assert.match(frame.srcdoc, /data-page-location="https:\/\/1cv.app\/privacy\/"/);
  assert.doesNotMatch(frame.srcdoc, /fixture|linkedin|email=|allow-same-origin|<form|<a /);
  b.tracker.sync(); b.tracker.setChoice("granted");
  assert.equal(b.frames.length, 1);
  assert.equal(b.frames[0], frame);
  b.tracker.setChoice("denied");
  assert.equal(b.frames.length, 0);
});

test("private routes, privacy signals, QA and previews suppress saved grants", () => {
  for (const options of [
    { href: "https://1cv.app/profile/private" }, { href: "https://localhost/" },
    { href: "https://1cv.app/?onecv_qa=1" }, { href: "https://1cv.app/?launch_qa=1" },
    { navigator: { doNotTrack: "1" } }, { navigator: { doNotTrack: "yes" } },
    { navigator: { globalPrivacyControl: true } },
  ]) {
    const b = browser({ ...options, stored: { [ahrefsConsentKey]: "granted" } });
    b.tracker.sync(); assert.equal(b.frames.length, 0);
  }
  const b = browser({ stored: { [ahrefsConsentKey]: "granted" } });
  b.tracker.sync(); b.win.location.href = "https://1cv.app/profile/private"; b.tracker.sync();
  assert.equal(b.frames.length, 0);
});

test("cross-tab withdrawal and page exit remove the running vendor document", () => {
  const b = browser({ stored: { [ahrefsConsentKey]: "granted" } });
  b.tracker.sync(); assert.equal(b.frames.length, 1);
  b.storage.set(ahrefsConsentKey, "denied"); b.events.get("storage")({ key: ahrefsConsentKey });
  assert.equal(b.frames.length, 0);
  b.tracker.setChoice("granted"); b.events.get("pagehide")();
  assert.equal(b.frames.length, 0);
  b.events.get("pageshow")(); assert.equal(b.frames.length, 1);
  b.tracker.destroy(); assert.equal(b.frames.length, 0); assert.equal(b.events.size, 0);
});

test("blocked storage remains default-off and accepts a current-page choice without errors", () => {
  const b = browser({ blocked: true }); b.tracker.sync();
  assert.equal(b.frames.length, 0);
  b.tracker.setChoice("granted"); assert.equal(b.frames.length, 1);
  b.tracker.setChoice("denied"); assert.equal(b.frames.length, 0);
});
