import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { expandHome, oneCvHome } from "./profile.js";
import type { BrowserSession } from "./adapters/types.js";

export interface BrowserOptions {
  cdpUrl?: string;
  headless: boolean;
  userDataDir?: string;
}

export async function openBrowser(options: BrowserOptions): Promise<BrowserSession> {
  if (options.cdpUrl) {
    const browser = await chromium.connectOverCDP(options.cdpUrl);
    const context = browser.contexts()[0];
    if (!context) throw new Error(`No browser context found at ${options.cdpUrl}`);
    return { context, close: async () => undefined };
  }

  const userDataDir = expandHome(options.userDataDir ?? `${oneCvHome()}/browser-profile`);
  await mkdir(userDataDir, { recursive: true, mode: 0o700 });
  try {
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chrome",
      headless: options.headless
    });
    return { context, close: () => context.close() };
  } catch (error) {
    throw new Error(
      `Could not start Google Chrome. Install it or connect to an existing browser with --cdp-url. ${error instanceof Error ? error.message : ""}`
    );
  }
}
