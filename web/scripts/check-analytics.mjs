import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else files.push(path);
  }
  return files;
}

const files = await filesIn(dist);
const text = (await Promise.all(
  files
    .filter((path) => /\.(html|js)$/.test(path))
    .map((path) => readFile(path, "utf8"))
)).join("\n");
const headers = await readFile(join(dist, "_headers"), "utf8");

for (const marker of [
  "G-JCEGJ83QQN",
  "onecv_ahrefs_consent_v1",
  "data-ahrefs-public",
  "data-page-location",
  "r8EFbPfXguYmeXSCpsxH5Q",
  "analytics_storage",
  "ad_personalization",
  "Cookie settings",
  "/cookie-policy/",
]) {
  if (!text.includes(marker)) throw new Error(`Analytics build is missing ${marker}.`);
}

for (const origin of [
  "https://analytics.ahrefs.com",
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
]) {
  if (!headers.includes(origin)) throw new Error(`CSP is missing ${origin}.`);
}

const vercel = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
const sourceCsp = vercel.headers[0].headers.find((h) => h.key === "Content-Security-Policy").value;
const builtCsp = headers.split("\n").find((line) => line.trim().startsWith("Content-Security-Policy:"))?.trim().slice("Content-Security-Policy:".length).trim();
if (sourceCsp !== builtCsp) throw new Error("Source and built security policies differ.");
console.log("Verified consent-aware GA4/Ahrefs build markers and matching CSP.");
