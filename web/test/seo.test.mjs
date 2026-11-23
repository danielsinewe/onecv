import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const page = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
test('public pages publish complete sharing metadata with their own canonical identity', async () => {
  for (const path of ['', 'privacy/', 'terms/', 'imprint/', 'cookie-policy/']) {
    const html = await page(path + 'index.html');
    for (const key of ['type', 'url', 'title', 'description', 'image']) {
      assert.match(html, new RegExp(`<meta property="og:${key}" content="[^"]+"`), path + key);
    }
    assert.ok(html.includes(`property="og:url" content="https://1cv.app/${path}"`));
    assert.ok(html.includes(`rel="canonical" href="https://1cv.app/${path}"`));
  }
  const home = await page('index.html');
  const schema = JSON.parse(home.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.deepEqual(schema, {'@context': 'https://schema.org', '@type': 'Organization', name: '1CV', url: 'https://1cv.app/', logo: 'https://1cv.app/icon.svg'});
  assert.doesNotMatch(home, /openai\.com\/codex\/get-started/);
  assert.match(await page('404.html'), /noindex/);
});
