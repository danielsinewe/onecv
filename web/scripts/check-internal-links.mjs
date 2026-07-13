import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const requiredRoutes = [
  "/",
  "/register",
  "/terms-of-use",
  "/privacy-policy",
  "/cookie-policy",
  "/privacy/",
  "/terms/",
  "/imprint/"
];

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

const redirectsText = await readFile(join(dist, "_redirects"), "utf8");
const redirects = new Map(
  redirectsText
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter(([source, target]) => source?.startsWith("/") && target?.startsWith("/"))
    .map(([source, target]) => [source, target])
);

function routeFiles(pathname) {
  if (pathname === "/") return [join(dist, "index.html")];
  const clean = pathname.replace(/^\//, "").replace(/\/$/, "");
  return [join(dist, clean, "index.html"), join(dist, `${clean}.html`)];
}

async function routeExists(pathname, visited = new Set()) {
  if (visited.has(pathname)) return false;
  visited.add(pathname);
  if (redirects.has(pathname)) return routeExists(new URL(redirects.get(pathname), "https://1cv.app").pathname, visited);
  for (const candidate of routeFiles(pathname)) {
    try {
      await access(candidate);
      return true;
    } catch {}
  }
  return false;
}

const htmlFiles = (await filesIn(dist)).filter((path) => path.endsWith(".html"));
const discoveredRoutes = new Set(requiredRoutes);
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  for (const match of html.matchAll(/href=["']([^"']+)["']/g)) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    const url = new URL(href, "https://1cv.app");
    if (url.hostname === "1cv.app" && !/\.[a-z0-9]+$/i.test(url.pathname)) discoveredRoutes.add(url.pathname);
  }
}

const missing = [];
for (const route of discoveredRoutes) {
  if (!await routeExists(route)) missing.push(route);
}
if (missing.length) throw new Error(`Missing internal routes: ${missing.join(", ")}`);
console.log(`Checked ${discoveredRoutes.size} internal routes.`);
