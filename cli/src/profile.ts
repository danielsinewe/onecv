import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { z } from "zod";

const Url = z.string().url();

export const ProfileSchema = z.object({
  version: z.literal(1),
  identity: z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    location: z.string().optional(),
    links: z.object({
      website: Url.optional(),
      linkedin: Url.optional(),
      xing: Url.optional(),
      github: Url.optional()
    }).default({})
  }),
  professional: z.object({
    headline: z.string().min(1),
    summary: z.string().default(""),
    specialties: z.array(z.string().min(1)).min(1),
    skills: z.array(z.string().min(1)).default([]),
    languages: z.array(z.string().min(1)).default([])
  }),
  preferences: z.object({
    availableFrom: z.string().optional(),
    remote: z.boolean().default(true),
    locations: z.array(z.string()).default([]),
    rate: z.object({
      amount: z.number().positive(),
      currency: z.string().length(3).default("EUR"),
      unit: z.enum(["hour", "day"])
    }).optional()
  }).default({ remote: true, locations: [] }),
  assets: z.object({
    cv: z.string().optional()
  }).default({})
});

export type Profile = z.infer<typeof ProfileSchema>;

export const PROFILE_TEMPLATE: Profile = {
  version: 1,
  identity: {
    fullName: "Your name",
    email: "you@example.com",
    location: "Berlin, Germany",
    links: {
      linkedin: "https://www.linkedin.com/in/your-profile"
    }
  },
  professional: {
    headline: "Independent product and software consultant",
    summary: "",
    specialties: ["Software Development"],
    skills: [],
    languages: ["German", "English"]
  },
  preferences: {
    remote: true,
    locations: []
  },
  assets: {
    cv: "~/Documents/CV.pdf"
  }
};

export function oneCvHome(): string {
  return resolve(process.env.ONECV_HOME ?? `${homedir()}/.1cv`);
}

export function defaultProfilePath(): string {
  return resolve(oneCvHome(), "profile.json");
}

export function expandHome(path: string): string {
  return path === "~" || path.startsWith("~/")
    ? resolve(homedir(), path.slice(path === "~" ? 1 : 2))
    : resolve(path);
}

export async function createProfile(
  path = defaultProfilePath(),
  force = false,
  profile: Profile = PROFILE_TEMPLATE
): Promise<string> {
  const target = expandHome(path);
  if (!force) {
    try {
      await stat(target);
      throw new Error(`Profile already exists: ${target}. Use --force to replace it.`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Profile already exists:")) throw error;
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error;
    }
  }
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  const validated = ProfileSchema.parse(profile);
  await writeFile(target, `${JSON.stringify(validated, null, 2)}\n`, { mode: 0o600 });
  return target;
}

export async function loadProfile(path = defaultProfilePath()): Promise<Profile> {
  const target = expandHome(path);
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(target, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`Invalid JSON in ${target}: ${error.message}`);
    throw new Error(`Could not read profile at ${target}`);
  }
  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Invalid 1CV profile:\n${details}`);
  }
  return parsed.data;
}

export function preferredProfileUrl(profile: Profile): string | undefined {
  return profile.identity.links.linkedin
    ?? profile.identity.links.xing
    ?? profile.identity.links.website
    ?? profile.identity.links.github;
}
