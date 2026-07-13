import { access, stat } from "node:fs/promises";
import type { Page } from "playwright";
import { expandHome, preferredProfileUrl, type Profile } from "../profile.js";
import type { ApplicationPlan, ApplyOptions, PlatformAdapter } from "./types.js";

const URL = "https://bizforward.de/freelancer-sign-up/";

function specialty(profile: Profile): string {
  return profile.professional.specialties.join(", ");
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
      if (await save.isVisible().catch(() => false)) await save.click();
    }

    await page.getByRole("textbox", { name: "Name", exact: true }).fill(profile.identity.fullName);
    await page.getByRole("textbox", { name: "E-Mail", exact: true }).fill(profile.identity.email);
    await page.getByRole("textbox", { name: "Fachgebiet", exact: true }).fill(specialty(profile));
    await page.getByRole("textbox", { name: "Dein Profil", exact: true }).fill(preferredProfileUrl(profile) ?? "");

    if (profile.assets.cv) {
      const cv = expandHome(profile.assets.cv);
      await access(cv);
      await page.locator('input[type="file"][name="input_10"]').setInputFiles(cv);
    }

    if (options.consent) {
      await page.getByRole("checkbox", { name: /bizforward meine persönlichen Daten/ }).check();
    }

    const expected = [
      ["Name", profile.identity.fullName],
      ["E-Mail", profile.identity.email],
      ["Fachgebiet", specialty(profile)],
      ["Dein Profil", preferredProfileUrl(profile) ?? ""]
    ] as const;
    for (const [name, value] of expected) {
      const actual = await page.getByRole("textbox", { name, exact: true }).inputValue();
      if (actual !== value) throw new Error(`Browser verification failed for ${name}.`);
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
