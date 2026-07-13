import { access, stat } from "node:fs/promises";
import type { Page } from "playwright";
import { expandHome, preferredProfileUrl, type Profile } from "../profile.js";
import type { ApplicationPlan, ApplyOptions, PlatformAdapter } from "./types.js";

const URL = "https://bizforward.de/freelancer-sign-up/";

function specialty(profile: Profile): string {
  return profile.professional.specialties.join(", ");
}

async function fillAndVerify(page: Page, name: string, value: string): Promise<void> {
  const field = page.getByRole("textbox", { name, exact: true });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await field.fill(value);
    if (await field.inputValue() === value) return;
    await page.waitForTimeout(150);
  }
  throw new Error(`Browser verification failed for ${name}.`);
}

export const bizforwardAdapter: PlatformAdapter = {
  id: "bizforward",
  name: "BizForward",
  url: URL,

  async plan(profile): Promise<ApplicationPlan> {
    const profileUrl = preferredProfileUrl(profile);
    const warnings: string[] = [];
    if (!profileUrl) warnings.push("Add a LinkedIn, XING, website, or GitHub URL.");
    if (profile.assets.cv) {
      try {
        const cv = expandHome(profile.assets.cv);
        const file = await stat(cv);
        if (file.size > 25 * 1024 * 1024) warnings.push(`CV exceeds BizForward's 25 MB limit: ${cv}`);
      } catch {
        warnings.push(`CV not found: ${expandHome(profile.assets.cv)}`);
      }
    } else {
      warnings.push("No CV configured. BizForward accepts one, but it is optional.");
    }
    return {
      platform: this.name,
      url: this.url,
      fields: [
        { field: "Name", value: profile.identity.fullName, required: true },
        { field: "E-Mail", value: profile.identity.email, required: true },
        { field: "Fachgebiet", value: specialty(profile), required: true },
        { field: "Dein Profil", value: profileUrl ?? "", required: true },
        { field: "CV", value: profile.assets.cv ? expandHome(profile.assets.cv) : "", required: false }
      ],
      warnings
    };
  },

  async fill(page: Page, profile: Profile, options: ApplyOptions): Promise<void> {
    const plan = await this.plan(profile);
    const missing = plan.fields.filter((field) => field.required && !field.value);
    if (missing.length) throw new Error(`Missing required fields: ${missing.map((field) => field.field).join(", ")}`);

    await page.goto(this.url, { waitUntil: "domcontentloaded" });

    const cookieDialog = page.getByRole("dialog");
    if (await cookieDialog.isVisible().catch(() => false)) {
      const save = cookieDialog.getByRole("button", { name: "Speichern", exact: true });
      if (await save.isVisible().catch(() => false)) {
        await save.click();
        await cookieDialog.waitFor({ state: "hidden" }).catch(() => undefined);
      }
    }

    await fillAndVerify(page, "Name", profile.identity.fullName);
    await fillAndVerify(page, "E-Mail", profile.identity.email);
    await fillAndVerify(page, "Fachgebiet", specialty(profile));
    await fillAndVerify(page, "Dein Profil", preferredProfileUrl(profile) ?? "");

    if (profile.assets.cv) {
      const cv = expandHome(profile.assets.cv);
      await access(cv);
      await page.locator('input[type="file"][name="input_10"]').setInputFiles(cv);
    }

    if (options.consent) {
      await page.getByRole("checkbox", { name: /bizforward meine persönlichen Daten/ }).check();
    }

    if (options.consent && !await page.getByRole("checkbox", { name: /bizforward meine persönlichen Daten/ }).isChecked()) {
      throw new Error("Browser verification failed for BizForward consent.");
    }
  },

  async submit(page: Page): Promise<void> {
    await page.getByRole("button", { name: "SENDEN", exact: true }).click();
  },

  async verify(page: Page): Promise<string> {
    const confirmation = page.locator("#gform_confirmation_wrapper_1");
    await confirmation.waitFor({ state: "visible", timeout: 15_000 });
    return (await confirmation.innerText()).trim() || "BizForward confirmed the submission.";
  }
};
