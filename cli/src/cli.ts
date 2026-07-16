#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { bizforwardAdapter } from "./adapters/bizforward.js";
import { nineAmAdapter } from "./adapters/nine-am.js";
import type { PlatformAdapter } from "./adapters/types.js";
import { openBrowser } from "./browser.js";
import { createProfile, defaultProfilePath, loadProfile, oneCvHome, preferredProfileUrl, saveProfile, type Profile } from "./profile.js";
import { diffPlan, loadPlatformState, recordPrepared, recordSubmitted } from "./state.js";

const adapters: Record<string, PlatformAdapter> = { "9am": nineAmAdapter, bizforward: bizforwardAdapter };

interface ParsedArgs {
  positionals: string[];
  flags: Map<string, string | boolean>;
}

function parseArgs(args: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string | boolean>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    if (!rawKey) continue;
    if (inlineValue !== undefined) {
      flags.set(rawKey, inlineValue);
      continue;
    }
    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      flags.set(rawKey, next);
      index += 1;
    } else {
      flags.set(rawKey, true);
    }
  }
  return { positionals, flags };
}

function textFlag(args: ParsedArgs, name: string, fallback?: string): string | undefined {
  const value = args.flags.get(name);
  return typeof value === "string" ? value : fallback;
}

function adapterFor(id: string | undefined): PlatformAdapter {
  if (!id || !adapters[id]) throw new Error(`Unknown platform: ${id ?? "(missing)"}. Run "1cv platforms".`);
  return adapters[id];
}

function help(): void {
  console.log(`1CV — one local profile for freelance marketplaces

Usage:
  1cv start <linkedin-url> [--print]
  1cv init --name name --email email --specialty specialty
           [--profile-url url] [--profile path] [--force]
  1cv profile [--profile path] [--json]
  1cv edit [--name name] [--email email] [--specialty specialty]
           [--profile-url url] [--cv path | --clear-cv] [--profile path]
  1cv platforms [--json]
  1cv plan <platform> [--profile path] [--json]
  1cv diff <platform> [--profile path] [--json]
  1cv status <platform> [--profile path] [--json]
  1cv search 9am [--profile path]
                 [--browser-profile path | --cdp-url url] [--headless]
  1cv apply <platform> [--profile path] [--consent] [--submit]
                           [--browser-profile path | --cdp-url url] [--headless]

Safety:
  search prepares matching filters and never applies to a job. apply fills a
  marketplace form and pauses for review. It never submits unless both
  --submit and --consent are present. Profile data stays on this machine.`);
}

function linkedinProfileUrl(value: string | undefined): string {
  if (!value) throw new Error("Missing LinkedIn profile URL.");
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid LinkedIn profile URL, for example linkedin.com/in/your-name.");
  }
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const match = url.pathname.match(/^\/in\/([a-z0-9_-]+)\/?$/i);
  if (hostname !== "linkedin.com" || !match) {
    throw new Error("Enter a public LinkedIn profile URL in the form linkedin.com/in/your-name.");
  }
  return `https://www.linkedin.com/in/${match[1]}`;
}

function onboardingPrompt(linkedinUrl: string): string {
  return `Use the 1CV skill in this Codex desktop task to import my visible LinkedIn profile from ${linkedinUrl} with Codex's in-app browser. Keep browser work inside Codex and let me handle login or verification. Show me the extracted profile for review, ask only for essential missing information, create my local 1CV, then prepare BizForward without submitting anything.`;
}

function codexDesktopLink(prompt: string): string {
  const params = new URLSearchParams({ prompt, path: oneCvHome() });
  return `codex://new?${params.toString()}`;
}

interface CodexRuntime {
  command: string;
  prefix: string[];
}

let activeCodexRuntime: CodexRuntime | undefined;

function resolveCodexRuntime(): CodexRuntime {
  if (activeCodexRuntime) return activeCodexRuntime;
  const appRuntime = "/Applications/ChatGPT.app/Contents/Resources/codex";
  const candidates: CodexRuntime[] = [
    ...(process.env.CODEX_BIN ? [{ command: process.env.CODEX_BIN, prefix: [] }] : []),
    ...(process.platform === "darwin" && existsSync(appRuntime) ? [{ command: appRuntime, prefix: [] }] : []),
    { command: "codex", prefix: [] },
    { command: process.platform === "win32" ? "npx.cmd" : "npx", prefix: ["--yes", "@openai/codex@latest"] }
  ];
  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, [...candidate.prefix, "--version"], { encoding: "utf8", stdio: "pipe" });
    if (result.status === 0) return activeCodexRuntime = candidate;
  }
  return candidates.at(-1)!;
}

function codex(args: string[], options: { inherit?: boolean } = {}): ReturnType<typeof spawnSync> {
  const runtime = resolveCodexRuntime();
  return spawnSync(runtime.command, [...runtime.prefix, ...args], {
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : "pipe"
  });
}

function requireSuccessfulCodex(result: ReturnType<typeof spawnSync>, action: string): void {
  if (result.error && "code" in result.error && result.error.code === "ENOENT") {
    throw new Error("Codex is required for LinkedIn import. Install it from https://openai.com/codex/get-started/ and run this command again.");
  }
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    throw new Error(`${action} failed${detail ? `: ${detail}` : "."}`);
  }
}

function openCodexDesktop(link: string): void {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer.exe" : "xdg-open";
  const args = process.platform === "darwin" ? ["-b", "com.openai.codex", link] : [link];
  const result = spawnSync(command, args, { encoding: "utf8", stdio: "pipe" });
  if (result.error && "code" in result.error && result.error.code === "ENOENT") {
    throw new Error("The Codex desktop app is required. Install it from https://openai.com/codex/get-started/ and run this command again.");
  }
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    throw new Error(`Could not open the Codex desktop app${detail ? `: ${detail}` : "."}`);
  }
}

function startWithCodex(linkedinUrl: string, printOnly: boolean): void {
  const prompt = onboardingPrompt(linkedinUrl);
  const link = codexDesktopLink(prompt);
  if (printOnly) {
    console.log(link);
    return;
  }

  requireSuccessfulCodex(codex(["--version"]), "Codex check");
  const marketplaces = codex(["plugin", "marketplace", "list"]);
  requireSuccessfulCodex(marketplaces, "Marketplace check");
  if (String(marketplaces.stdout).includes("Marketplace `1cv`")) {
    requireSuccessfulCodex(codex(["plugin", "marketplace", "upgrade", "1cv"]), "1CV marketplace update");
  } else {
    requireSuccessfulCodex(codex(["plugin", "marketplace", "add", "danielsinewe/onecv", "--ref", "main"]), "1CV marketplace install");
  }

  const plugins = codex(["plugin", "list"]);
  requireSuccessfulCodex(plugins, "Plugin check");
  if (!String(plugins.stdout).includes("1cv@1cv  installed")) {
    requireSuccessfulCodex(codex(["plugin", "add", "1cv@1cv"]), "1CV plugin install");
  }

  mkdirSync(oneCvHome(), { recursive: true, mode: 0o700 });
  console.log("Opening 1CV in the Codex app…");
  openCodexDesktop(link);
  console.log("Review the prefilled request in Codex, then send it when you are ready.");
}

function profileLink(url: string): Profile["identity"]["links"] {
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  if (hostname === "linkedin.com") return { linkedin: url };
  if (hostname === "xing.com") return { xing: url };
  if (hostname === "github.com") return { github: url };
  return { website: url };
}

async function requiredAnswer(
  readline: ReturnType<typeof createInterface>,
  question: string,
  supplied?: string
): Promise<string> {
  if (supplied?.trim()) return supplied.trim();
  if (!stdin.isTTY) throw new Error(`Missing ${question.replace(/:\s*$/, "").toLowerCase()}. Pass it as a command option.`);
  while (true) {
    const answer = (await readline.question(question)).trim();
    if (answer) return answer;
  }
}

async function onboardingProfile(args: ParsedArgs): Promise<Profile> {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    if (stdin.isTTY) console.log("Your profile stays on this machine. 1CV does not collect credentials or analytics.\n");
    const fullName = await requiredAnswer(readline, "Name: ", textFlag(args, "name"));
    const email = await requiredAnswer(readline, "Email: ", textFlag(args, "email"));
    const specialty = await requiredAnswer(readline, "Specialty: ", textFlag(args, "specialty"));
    const publicProfile = await requiredAnswer(readline, "LinkedIn, XING, or website URL: ", textFlag(args, "profile-url"));
    const suppliedCv = textFlag(args, "cv");
    const cv = suppliedCv !== undefined
      ? suppliedCv.trim()
      : stdin.isTTY ? (await readline.question("CV file (optional): ")).trim() : "";
    return {
      version: 1,
      identity: {
        fullName,
        email,
        links: profileLink(publicProfile)
      },
      professional: {
        headline: specialty,
        summary: "",
        specialties: [specialty],
        skills: [],
        languages: []
      },
      preferences: {
        remote: true,
        locations: []
      },
      assets: cv ? { cv } : {}
    };
  } finally {
    readline.close();
  }
}

async function editableAnswer(
  readline: ReturnType<typeof createInterface>,
  label: string,
  current: string,
  supplied?: string
): Promise<string> {
  if (supplied !== undefined) return supplied.trim();
  if (!stdin.isTTY) return current;
  const answer = (await readline.question(`${label} [${current || "none"}]: `)).trim();
  return answer || current;
}

async function editedProfile(args: ParsedArgs, current: Profile): Promise<Profile> {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const fullName = await editableAnswer(readline, "Name", current.identity.fullName, textFlag(args, "name"));
    const email = await editableAnswer(readline, "Email", current.identity.email, textFlag(args, "email"));
    const specialty = await editableAnswer(
      readline,
      "Specialty",
      current.professional.specialties.join(", "),
      textFlag(args, "specialty")
    );
    const currentUrl = preferredProfileUrl(current) ?? "";
    const publicProfile = await editableAnswer(readline, "Public profile", currentUrl, textFlag(args, "profile-url"));
    const currentCv = current.assets.cv ?? "";
    const cv = args.flags.has("clear-cv")
      ? ""
      : await editableAnswer(readline, "CV file", currentCv, textFlag(args, "cv"));
    return {
      ...current,
      identity: {
        ...current.identity,
        fullName,
        email,
        links: publicProfile === currentUrl ? current.identity.links : profileLink(publicProfile)
      },
      professional: {
        ...current.professional,
        specialties: specialty.split(",").map((value) => value.trim()).filter(Boolean)
      },
      assets: cv ? { ...current.assets, cv } : {}
    };
  } finally {
    readline.close();
  }
}

function printPlan(plan: Awaited<ReturnType<PlatformAdapter["plan"]>>): void {
  console.log(`${plan.platform}\n${plan.url}`);
  for (const field of plan.fields) console.log(`${field.required ? "*" : " "} ${field.field}: ${field.value || "—"}`);
  for (const warning of plan.warnings) console.log(`! ${warning}`);
}

async function waitForReview(message = "Review the filled form in Chrome. Press Enter to close 1CV… "): Promise<void> {
  if (!stdin.isTTY) return;
  const readline = createInterface({ input: stdin, output: stdout });
  await readline.question(message);
  readline.close();
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const [command, target] = args.positionals;
  const profilePath = textFlag(args, "profile", defaultProfilePath())!;

  if (!command || command === "help" || args.flags.has("help")) {
    help();
    return;
  }

  if (command === "init") {
    const profile = await onboardingProfile(args);
    const path = await createProfile(profilePath, args.flags.has("force"), profile);
    console.log(`Created ${path}`);
    console.log("Next: 1cv platforms");
    return;
  }

  if (command === "start") {
    startWithCodex(linkedinProfileUrl(target), args.flags.has("print"));
    return;
  }

  if (command === "profile") {
    const profile = await loadProfile(profilePath);
    if (args.flags.has("json")) console.log(JSON.stringify(profile, null, 2));
    else console.log(`Valid profile: ${profile.identity.fullName} <${profile.identity.email}>\n${profilePath}`);
    return;
  }

  if (command === "edit") {
    if (args.flags.has("clear-cv") && textFlag(args, "cv") !== undefined) {
      throw new Error("Use either --cv or --clear-cv, not both.");
    }
    const current = await loadProfile(profilePath);
    const edited = await editedProfile(args, current);
    if (JSON.stringify(current) === JSON.stringify(edited)) {
      console.log("No profile changes.");
      return;
    }
    const path = await saveProfile(profilePath, edited);
    console.log(`Updated ${path}`);
    return;
  }

  if (command === "platforms") {
    const platforms = Object.values(adapters).map(({ id, name, url }) => ({ id, name, url }));
    if (args.flags.has("json")) console.log(JSON.stringify(platforms, null, 2));
    else platforms.forEach((item) => console.log(`${item.id}\t${item.name}\t${item.url}`));
    return;
  }

  if (command === "plan") {
    const plan = await adapterFor(target).plan(await loadProfile(profilePath));
    if (args.flags.has("json")) console.log(JSON.stringify(plan, null, 2));
    else printPlan(plan);
    if (plan.fields.some((field) => field.required && !field.value)) process.exitCode = 2;
    return;
  }

  if (command === "diff" || command === "status") {
    const adapter = adapterFor(target);
    const plan = await adapter.plan(await loadProfile(profilePath));
    const state = await loadPlatformState(adapter.id, profilePath);
    const changes = diffPlan(plan, state);
    if (args.flags.has("json")) {
      console.log(JSON.stringify({ platform: adapter.name, state: state ?? null, changes }, null, 2));
      return;
    }
    if (command === "diff") {
      if (!state?.lastPrepared) console.log(`${adapter.name}: not prepared yet.`);
      else if (!changes.length) console.log(`${adapter.name}: no changes since ${state.lastPrepared.at}.`);
      else {
        console.log(`${adapter.name}: ${changes.length} changed field${changes.length === 1 ? "" : "s"}.`);
        for (const change of changes) console.log(`${change.field}: ${change.before || "—"} → ${change.after || "—"}`);
      }
      return;
    }
    if (!state?.lastPrepared) console.log(`${adapter.name}: not prepared.`);
    else if (state.lastSubmitted?.at === state.lastPrepared.at) {
      console.log(`${adapter.name}: submitted ${state.lastSubmitted.at}.\n${state.lastSubmitted.confirmation}`);
    } else {
      console.log(`${adapter.name}: prepared ${state.lastPrepared.at}. Nothing submitted from this fill.`);
      if (state.lastSubmitted) console.log(`Previous submission: ${state.lastSubmitted.at}.`);
    }
    if (changes.length) console.log(`${changes.length} profile change${changes.length === 1 ? "" : "s"} since the last fill.`);
    return;
  }

  if (command === "apply" || command === "search") {
    const adapter = adapterFor(target);
    const isSearch = adapter.workflow === "search";
    if (command === "search" && !isSearch) throw new Error(`${adapter.name} uses "1cv apply ${adapter.id}".`);
    if (command === "apply" && isSearch) throw new Error(`${adapter.name} uses "1cv search ${adapter.id}". No job application is automated.`);
    const profile = await loadProfile(profilePath);
    const consent = args.flags.has("consent");
    const submit = args.flags.has("submit");
    if (isSearch && (consent || submit)) throw new Error("9am search does not accept --consent or --submit.");
    if (submit && !consent) throw new Error("--submit requires --consent. Consent is never inferred.");

    const plan = await adapter.plan(profile);
    if (plan.warnings.length) printPlan(plan);
    const session = await openBrowser({
      cdpUrl: textFlag(args, "cdp-url"),
      headless: args.flags.has("headless"),
      userDataDir: textFlag(args, "browser-profile")
    });
    try {
      const page = await session.context.newPage();
      await adapter.fill(page, profile, { consent, headless: args.flags.has("headless"), submit });
      await recordPrepared(adapter.id, profilePath, plan);
      if (submit) {
        await adapter.submit(page);
        const confirmation = await adapter.verify(page);
        await recordSubmitted(adapter.id, profilePath, plan, confirmation);
        console.log(confirmation);
      } else if (isSearch) {
        console.log(await adapter.verify(page));
        console.log("No job application has been submitted.");
        await waitForReview("Review the 9am matches in Chrome. Press Enter to close 1CV… ");
      } else {
        console.log("Form filled. Nothing has been submitted.");
        await waitForReview();
      }
    } finally {
      await session.close();
    }
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`1cv: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
