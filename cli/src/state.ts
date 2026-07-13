import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import type { ApplicationPlan } from "./adapters/types.js";
import { expandHome } from "./profile.js";

const FieldSnapshotSchema = z.object({
  field: z.string(),
  value: z.string()
});

const PlanSnapshotSchema = z.object({
  at: z.string().datetime(),
  fields: z.array(FieldSnapshotSchema)
});

const PlatformStateSchema = z.object({
  version: z.literal(1),
  platform: z.string(),
  lastPrepared: PlanSnapshotSchema.optional(),
  lastSubmitted: PlanSnapshotSchema.extend({ confirmation: z.string() }).optional()
});

export type PlatformState = z.infer<typeof PlatformStateSchema>;

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

export function platformStatePath(platform: string, profilePath: string): string {
  return resolve(dirname(expandHome(profilePath)), "platforms", `${platform}.json`);
}

function fields(plan: ApplicationPlan) {
  return plan.fields.map(({ field, value }) => ({ field, value }));
}

async function writeState(path: string, state: PlatformState): Promise<void> {
  const validated = PlatformStateSchema.parse(state);
  const temporary = `${path}.${process.pid}.tmp`;
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    await writeFile(temporary, `${JSON.stringify(validated, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

export async function loadPlatformState(platform: string, profilePath: string): Promise<PlatformState | undefined> {
  const path = platformStatePath(platform, profilePath);
  try {
    const parsed = JSON.parse(await readFile(path, "utf8"));
    return PlatformStateSchema.parse(parsed);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return undefined;
    if (error instanceof SyntaxError) throw new Error(`Invalid JSON in ${path}: ${error.message}`);
    if (error instanceof z.ZodError) throw new Error(`Invalid platform state at ${path}`);
    throw error;
  }
}

export async function recordPrepared(
  platform: string,
  profilePath: string,
  plan: ApplicationPlan,
  at = new Date().toISOString()
): Promise<PlatformState> {
  const previous = await loadPlatformState(platform, profilePath);
  const state: PlatformState = {
    version: 1,
    platform,
    lastPrepared: { at, fields: fields(plan) },
    lastSubmitted: previous?.lastSubmitted
  };
  await writeState(platformStatePath(platform, profilePath), state);
  return state;
}

export async function recordSubmitted(
  platform: string,
  profilePath: string,
  plan: ApplicationPlan,
  confirmation: string,
  at = new Date().toISOString()
): Promise<PlatformState> {
  const snapshot = { at, fields: fields(plan) };
  const state: PlatformState = {
    version: 1,
    platform,
    lastPrepared: snapshot,
    lastSubmitted: { ...snapshot, confirmation }
  };
  await writeState(platformStatePath(platform, profilePath), state);
  return state;
}

export function diffPlan(plan: ApplicationPlan, state: PlatformState | undefined): FieldChange[] {
  if (!state?.lastPrepared) return [];
  const previous = new Map(state.lastPrepared.fields.map(({ field, value }) => [field, value]));
  return plan.fields.flatMap(({ field, value }) => {
    const before = previous.get(field) ?? "";
    return before === value ? [] : [{ field, before, after: value }];
  });
}
