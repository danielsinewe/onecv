import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../main.js", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "");

function page({ clipboard, legacyCopy = () => false } = {}) {
  const elements = new Map();
  const listeners = new Map();
  for (const name of ["start-form", "linkedin-input", "command-output", "start-result", "copy-command", "form-error", "copy-status"]) {
    const attributes = new Map();
    elements.set(name, {
      textContent: "", value: "", hidden: name === "start-result", disabled: false,
      setAttribute: (key, value) => attributes.set(key, value),
      removeAttribute: (key) => attributes.delete(key),
      getAttribute: (key) => attributes.get(key),
      addEventListener: (event, handler) => listeners.set(`${name}:${event}`, handler),
      focus() { this.focused = true; }, scrollIntoView() {}
    });
  }
  elements.get("copy-command").textContent = "Copy setup command";
  const selection = { removeAllRanges() {}, addRange() {} };
  const timers = [];
  vm.runInNewContext(source, {
    URL,
    document: {
      querySelector: (query) => elements.get(query.slice(6, -1)),
      createRange: () => ({ selectNodeContents() {} }),
      execCommand: legacyCopy
    },
    navigator: { clipboard },
    window: { getSelection: () => selection, setTimeout: (fn) => timers.push(fn), clearTimeout() {} }
  });
  const emit = (name, event) => listeners.get(`${name}:${event}`)?.({ preventDefault() {} });
  const input = (value) => { elements.get("linkedin-input").value = value; emit("linkedin-input", "input"); };
  const submit = (value) => { input(value); emit("start-form", "submit"); };
  return { elements, emit, input, submit, timers };
}

test("valid profile reveals a local command and editing invalidates the previous handoff", () => {
  const p = page();
  p.submit("linkedin.com/in/onecv-journey-a");
  assert.equal(p.elements.get("start-result").hidden, false);
  assert.equal(p.elements.get("command-output").textContent,
    "npx --yes @danielsinewe/1cv start https://www.linkedin.com/in/onecv-journey-a");
  p.input("linkedin.com/in/onecv-journey-b");
  assert.equal(p.elements.get("start-result").hidden, true);
  assert.equal(p.elements.get("command-output").textContent, "");
  p.emit("start-form", "submit");
  assert.match(p.elements.get("command-output").textContent, /\/onecv-journey-b$/);
});

test("invalid profiles show validation and never retain a previous command", () => {
  const p = page();
  p.submit("linkedin.com/in/onecv-journey-a");
  p.submit("linkedin.com/company/example");
  assert.equal(p.elements.get("start-result").hidden, true);
  assert.equal(p.elements.get("command-output").textContent, "");
  assert.equal(p.elements.get("linkedin-input").getAttribute("aria-invalid"), "true");
  assert.match(p.elements.get("form-error").textContent, /LinkedIn profile URL/);
});

test("clipboard success is acknowledged only after write resolves", async () => {
  let resolve, written;
  const p = page({ clipboard: { writeText(value) { written = value; return new Promise((done) => { resolve = done; }); } } });
  p.submit("linkedin.com/in/onecv-journey-a");
  const copying = p.emit("copy-command", "click");
  assert.equal(p.elements.get("copy-command").disabled, true);
  assert.doesNotMatch(p.elements.get("copy-command").textContent, /Copied/);
  resolve(); await copying;
  assert.match(written, /\/onecv-journey-a$/);
  assert.equal(p.elements.get("copy-command").disabled, false);
  assert.match(p.elements.get("copy-status").textContent, /Copied/);
});

test("legacy clipboard success is supported when the modern API rejects", async () => {
  const p = page({ clipboard: { writeText: async () => { throw new Error("Denied"); } }, legacyCopy: () => true });
  p.submit("linkedin.com/in/onecv-journey-a");
  await p.emit("copy-command", "click");
  assert.match(p.elements.get("copy-status").textContent, /Copied/);
});

test("unavailable clipboard offers honest manual recovery and retry", async () => {
  const p = page();
  p.submit("linkedin.com/in/onecv-journey-a");
  await p.emit("copy-command", "click");
  assert.doesNotMatch(p.elements.get("copy-command").textContent, /Copied/);
  assert.match(p.elements.get("copy-status").textContent, /copy.*manually/i);
  assert.equal(p.elements.get("command-output").focused, true);
  assert.equal(p.elements.get("copy-command").disabled, false);
  assert.equal(p.elements.get("start-result").hidden, false);
});

test("a late clipboard result cannot report success for an edited or regenerated command", async () => {
  let resolve;
  const p = page({ clipboard: { writeText: () => new Promise((done) => { resolve = done; }) } });
  p.submit("linkedin.com/in/onecv-journey-a");
  const copying = p.emit("copy-command", "click");
  p.submit("linkedin.com/in/onecv-journey-b");
  resolve(); await copying;
  assert.match(p.elements.get("command-output").textContent, /\/onecv-journey-b$/);
  assert.equal(p.elements.get("copy-status").textContent, "");
  assert.equal(p.elements.get("copy-command").textContent, "Copy setup command");
});
