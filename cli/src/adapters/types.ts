import type { BrowserContext, Page } from "playwright";
import type { Profile } from "../profile.js";

export interface FieldPlan {
  field: string;
  value: string;
  required: boolean;
}

export interface ApplicationPlan {
  platform: string;
  url: string;
  fields: FieldPlan[];
  warnings: string[];
}

export interface ApplyOptions {
  consent: boolean;
  headless: boolean;
  submit: boolean;
}

export interface PlatformAdapter {
  id: string;
  name: string;
  url: string;
  workflow?: "application" | "search";
  plan(profile: Profile): Promise<ApplicationPlan>;
  fill(page: Page, profile: Profile, options: ApplyOptions): Promise<void>;
  submit(page: Page): Promise<void>;
  verify(page: Page): Promise<string>;
}

export interface BrowserSession {
  context: BrowserContext;
  close(): Promise<void>;
}
