import { applicationScriptPath } from "./production-contract.mjs";

const base = new URL(process.env.ONECV_PRODUCTION_URL ?? "https://1cv.app/");

const routes = ["/", "/privacy/", "/terms/", "/imprint/", "/cookie-policy/"];

for (const route of routes) {
  const url = new URL(route, base);
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}.`);

  const html = await response.text();
  const scriptPath = applicationScriptPath(html, url);

  const csp = response.headers.get("content-security-policy") ?? "";
  if (!csp.includes("script-src 'self'")) throw new Error(`${url} is missing the production CSP.`);
  if (!csp.includes("https://www.googletagmanager.com") || !csp.includes("https://*.google-analytics.com")) {
    throw new Error(`${url} blocks Google Analytics.`);
  }
  if (csp.includes("'unsafe-inline'") || csp.includes("'unsafe-eval'")) {
    throw new Error(`${url} has an unsafe script policy.`);
  }

  const scriptResponse = await fetch(new URL(scriptPath, url));
  if (!scriptResponse.ok) throw new Error(`${url} application module returned ${scriptResponse.status}.`);
  if (!/javascript/i.test(scriptResponse.headers.get("content-type") ?? "")) {
    throw new Error(`${url} application module is not served as JavaScript.`);
  }
  const script = await scriptResponse.text();
  if (!script.includes("G-JCEGJ83QQN")) throw new Error(`${url} is missing the GA4 measurement ID.`);

  if (route === "/" && !html.includes("Paste LinkedIn.")) {
    throw new Error(`${url} is missing the 1CV homepage.`);
  }
}

console.log(`Verified ${routes.length} production routes at ${base.origin}.`);
