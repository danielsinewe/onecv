// An offline replacement for browser.js. No browser or network is opened.
const browserModule = new URL("../../dist/browser.js", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "playwright" || specifier.startsWith("playwright/")) {
    throw new Error("The offline search fixture must not load Playwright");
  }
  const resolved = await nextResolve(specifier, context);
  return resolved.url === browserModule ? { ...resolved, url: import.meta.url } : resolved;
}

export function createSearchPage({ verificationFails = false } = {}) {
  const actions = [];
  const control = {
    getAttribute: async () => "true",
    click: async () => {},
    fill: async () => {},
    isChecked: async () => true,
    check: async () => {},
    uncheck: async () => {},
    focus: async () => actions.push("rate:focus")
  };
  const collection = { first: () => control, nth: () => control };
  const dialog = {
    waitFor: async ({ timeout }) => {
      if (timeout === 10_000) {
        actions.push("verify");
        if (verificationFails) throw new Error("Synthetic search verification failed");
      }
    },
    getByRole: (role) => {
      if (role === "button") return { first: () => ({ click: async () => actions.push("rate:open") }) };
      if (["switch", "combobox", "slider"].includes(role)) return collection;
      if (role === "checkbox") return control;
      throw new Error(`Unexpected offline role: ${role}`);
    }
  };
  return {
    actions,
    goto: async () => actions.push("goto"),
    locator: () => ({ count: async () => 1 }),
    getByRole: (role) => {
      if (role === "dialog") return dialog;
      throw new Error(`Unexpected offline page role: ${role}`);
    },
    getByText: () => ({ first: () => ({ textContent: async () => "3 Matching Jobs" }) }),
    keyboard: { press: async (key) => actions.push(key) }
  };
}

export async function openBrowser() {
  const page = createSearchPage({ verificationFails: process.env.ONECV_TEST_SEARCH_OUTCOME !== "success" });
  return { context: { newPage: async () => page }, close: async () => {} };
}
