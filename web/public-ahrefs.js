export const ahrefsConsentKey = "onecv_ahrefs_consent_v1";
const choices = new Set(["granted", "denied"]);
const publicPaths = new Set(["/", "/community", "/privacy", "/cookie-policy", "/terms", "/imprint"]);

export function publicPageUrl(href, navigator = {}) {
  try {
    const url = new URL(href);
    const path = url.pathname.replace(/\/$/, "") || "/";
    if (url.origin !== "https://1cv.app" || url.username || url.password || !publicPaths.has(path)) return null;
    if (["1", "yes"].includes(String(navigator.doNotTrack).toLowerCase()) || navigator.globalPrivacyControl) return null;
    if (url.searchParams.has("onecv_qa") || url.searchParams.has("launch_qa")) return null;
    return `https://1cv.app${path === "/" ? "/" : `${path}/`}`;
  } catch {
    return null;
  }
}

export function createPublicAhrefs(win) {
  let choice = readChoice();
  let frame = null;
  let page = null;

  function readChoice() {
    try {
      const value = win.localStorage.getItem(ahrefsConsentKey);
      return choices.has(value) ? value : null;
    } catch {
      return null;
    }
  }

  function remove() {
    frame?.remove();
    frame = null;
    page = null;
  }

  function sync() {
    const url = publicPageUrl(win.location.href, win.navigator);
    if (choice !== "granted" || !url) return remove();
    if (frame && page === url) return;
    remove();
    try {
      frame = win.document.createElement("iframe");
      frame.hidden = true;
      frame.title = "Optional public website analytics";
      frame.setAttribute("data-ahrefs-public", "");
      frame.setAttribute("sandbox", "allow-scripts");
      frame.referrerPolicy = "no-referrer";
      // The vendor sees this empty document, never the parent form, links or title.
      frame.srcdoc = `<!doctype html><html><head><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src https://analytics.ahrefs.com; connect-src https://analytics.ahrefs.com"><title>1CV public website</title></head><body><script async src="https://analytics.ahrefs.com/analytics.js" data-key="r8EFbPfXguYmeXSCpsxH5Q" data-page-location="${url}"></script></body></html>`;
      win.document.body.append(frame);
      page = url;
    } catch {
      remove();
    }
  }

  function setChoice(value) {
    if (!choices.has(value)) return;
    choice = value;
    try { win.localStorage.setItem(ahrefsConsentKey, value); } catch { /* Current-page choice still applies. */ }
    sync();
  }

  function onStorage(event) {
    if (event.key !== null && event.key !== ahrefsConsentKey) return;
    choice = readChoice();
    sync();
  }

  win.addEventListener("storage", onStorage);
  win.addEventListener("pagehide", remove);
  win.addEventListener("pageshow", sync);
  return {
    choice: () => choice,
    sync,
    setChoice,
    destroy() {
      remove();
      win.removeEventListener("storage", onStorage);
      win.removeEventListener("pagehide", remove);
      win.removeEventListener("pageshow", sync);
    },
  };
}
