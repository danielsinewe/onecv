export function applicationScriptPath(html, pageUrl) {
  if (!html.includes('href="/"')) throw new Error(`${pageUrl} has no route home.`);

  const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(([, attributes]) => ({
    src: attributes.match(/(?:^|\s)src\s*=\s*["']([^"']+)["']/i)?.[1],
    type: attributes.match(/(?:^|\s)type\s*=\s*["']([^"']+)["']/i)?.[1],
  }));
  if (scripts.some(({ src }) => src && new URL(src, pageUrl).pathname.startsWith("/_next/static/"))) {
    throw new Error(`${pageUrl} is being served through the obsolete Next.js runtime.`);
  }

  const app = scripts.find(({ src, type }) => {
    if (!src || type?.toLowerCase() !== "module") return false;
    const url = new URL(src, pageUrl);
    return url.origin === new URL(pageUrl).origin && /^\/assets\/main-[\w-]+\.js$/.test(url.pathname);
  });
  if (!app) throw new Error(`${pageUrl} is missing the current 1CV application module.`);
  return app.src;
}
