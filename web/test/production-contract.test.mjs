import assert from "node:assert/strict";
import test from "node:test";
import { applicationScriptPath } from "../scripts/production-contract.mjs";

const url = new URL("https://1cv.app/");
const current = '<a href="/">1CV</a><script type="module" crossorigin src="/assets/main-CpNzERpY.js"></script>';

test("current app remains identifiable with injected footer and earlier third-party scripts", () => {
  const html = '<script src="https://datafa.st/js/script.js"></script>' + current +
    '<footer data-onefooter-root></footer><script src="https://app.1footer.com/footer-activity.js"></script>';
  assert.equal(applicationScriptPath(html, url), "/assets/main-CpNzERpY.js");
});

test("obsolete Next runtime is rejected even when a current module is also present", () => {
  assert.throws(() => applicationScriptPath(current + '<script src="/_next/static/chunks/app.js"></script>', url), /obsolete Next.js runtime/);
});

test("a footer or third-party lookalike cannot establish a working app", () => {
  for (const html of [
    '<a href="/">1CV</a><footer data-onefooter-root></footer>',
    '<a href="/">1CV</a><script type="module" src="https://other.example/assets/main-abc.js"></script>',
    '<a href="/">1CV</a><script src="/assets/main-abc.js"></script>',
    '<a href="/">1CV</a><script type="module" data-src="/assets/main-abc.js"></script>',
  ]) assert.throws(() => applicationScriptPath(html, url), /missing the current 1CV application module/);
});
