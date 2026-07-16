import type { Locator, Page } from "playwright";
import type { Profile } from "../profile.js";
import type { ApplicationPlan, ApplyOptions, PlatformAdapter } from "./types.js";

const URL = "https://app.9am.works/job-search?page=1&smartFilter=1&tab=all";

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function nineAmSearchTerms(profile: Profile): string[] {
  return unique([...profile.professional.specialties, ...profile.professional.skills]);
}

async function enabled(control: Locator): Promise<boolean> {
  return await control.getAttribute("aria-checked") === "true";
}

async function enable(control: Locator): Promise<void> {
  if (!await enabled(control)) await control.click();
}

async function addSelectValues(page: Page, select: Locator, values: string[]): Promise<void> {
  for (const value of values) {
    await select.click();
    await select.fill(value);
    await page.keyboard.press("Enter");
  }
}

async function waitForSignedInSearch(page: Page, headless: boolean): Promise<void> {
  const profileLink = page.locator('a[href^="/talent/"]');
  if (await profileLink.count()) return;
  if (headless) throw new Error("9am sign-in is required. Run without --headless and sign in once in the 1CV browser.");
  console.log("Sign in to 9am in the opened browser. 1CV will continue automatically…");
  try {
    await profileLink.waitFor({ state: "visible", timeout: 5 * 60_000 });
  } catch {
    throw new Error("9am sign-in was not completed within five minutes. Run the command again when ready.");
  }
  await page.goto(URL, { waitUntil: "domcontentloaded" });
}

async function setHourlyMinimum(page: Page, dialog: Locator, amount: number): Promise<void> {
  const switches = dialog.getByRole("switch");
  await enable(switches.nth(1));
  const rangeButton = dialog.getByRole("button", { name: /set range|€/i }).first();
  await rangeButton.click();
  const minimum = dialog.getByRole("slider").first();
  await minimum.focus();
  await page.keyboard.press("Home");
  const target = Math.min(200, Math.max(0, Math.round(amount)));
  for (let value = 0; value < target; value += 1) await page.keyboard.press("ArrowRight");
}

export const nineAmAdapter: PlatformAdapter = {
  id: "9am",
  name: "9am",
  url: URL,
  workflow: "search",

  async plan(profile): Promise<ApplicationPlan> {
    const warnings: string[] = [];
    if (!nineAmSearchTerms(profile).length) warnings.push("Add at least one specialty or skill for useful job matching.");
    if (profile.preferences.rate?.unit === "day") {
      warnings.push("9am's search uses hourly or fixed-project budgets; the daily rate is left unchanged.");
    }
    return {
      platform: this.name,
      url: this.url,
      fields: [
        { field: "Match from 1CV profile", value: "On", required: true },
        { field: "Skills and keywords", value: nineAmSearchTerms(profile).join(", "), required: true },
        { field: "Remote only", value: profile.preferences.remote ? "Yes" : "No", required: false },
        { field: "Locations", value: profile.preferences.locations.join(", "), required: false },
        { field: "Languages", value: unique(profile.professional.languages).join(", "), required: false },
        {
          field: "Minimum hourly rate",
          value: profile.preferences.rate?.unit === "hour"
            ? `${profile.preferences.rate.currency} ${profile.preferences.rate.amount}`
            : "",
          required: false
        }
      ],
      warnings
    };
  },

  async fill(page: Page, profile: Profile, options: ApplyOptions): Promise<void> {
    await page.goto(this.url, { waitUntil: "domcontentloaded" });
    await waitForSignedInSearch(page, options.headless);

    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 15_000 });
    const switches = dialog.getByRole("switch");
    await enable(switches.first());

    const selects = dialog.getByRole("combobox");
    await addSelectValues(page, selects.nth(0), nineAmSearchTerms(profile));
    if (profile.preferences.locations.length) {
      await addSelectValues(page, selects.nth(1), [profile.preferences.locations[0]!]);
    }
    const remote = dialog.getByRole("checkbox", { name: "Only remote jobs" });
    if (profile.preferences.remote && !await remote.isChecked()) await remote.check();
    if (!profile.preferences.remote && await remote.isChecked()) await remote.uncheck();
    await addSelectValues(page, selects.nth(2), unique(profile.professional.languages));

    if (profile.preferences.rate?.unit === "hour") {
      await setHourlyMinimum(page, dialog, profile.preferences.rate.amount);
    }
  },

  async submit(): Promise<void> {
    throw new Error("9am job search preparation never submits a job application.");
  },

  async verify(page: Page): Promise<string> {
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 10_000 });
    const matching = page.getByText(/Matching Jobs$/).first();
    const summary = await matching.textContent().catch(() => null);
    return summary ? `9am search prepared — ${summary.trim()}.` : "9am search filters prepared.";
  }
};
