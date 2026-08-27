import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { PublicManifest } from "./types";
import { parseJsonLines, validateBundle } from "./validate";

const fixtureRoot = new URL("../../../public/fixtures/adaptive-hsi/v0.1.0/", import.meta.url);
const showcaseFixtures = ["adaptive-hsi", "wildfire-response", "maritime-sar"] as const;

async function loadFixture(root = fixtureRoot) {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8")) as PublicManifest;
  const traces: Record<string, unknown[]> = {};
  const outcomes: Record<string, unknown> = {};
  await Promise.all(manifest.runs.map(async (run) => {
    traces[run.run_id] = parseJsonLines(await readFile(new URL(run.trace_path, root), "utf8"));
    outcomes[run.run_id] = JSON.parse(await readFile(new URL(run.outcome_path, root), "utf8"));
  }));
  return validateBundle(manifest, traces, outcomes);
}

describe("adaptive HSI public fixture", () => {
  it("validates the paired traces and shared initial conditions", async () => {
    const bundle = await loadFixture();
    expect(new Set(bundle.manifest.runs.map((run) => run.initial_conditions_digest)).size).toBe(1);
    expect(Object.values(bundle.eventsByRun)).toHaveLength(2);
  });

  it("never starts the fixed downlink rejected during blackout", async () => {
    const bundle = await loadFixture();
    const fixed = bundle.manifest.runs.find((run) => run.policy.kind === "fixed")!;
    const events = bundle.eventsByRun[fixed.run_id];
    const rejected = events.find((event) => event.type === "action.rejected" && event.payload.action_type === "downlink");
    expect(rejected).toBeDefined();
    expect(events.some((event) => event.type === "action.started" && event.payload.action_id === rejected?.payload.action_id)).toBe(false);
  });

  it("shows a measurable adaptive policy advantage", async () => {
    const bundle = await loadFixture();
    const fixedRun = bundle.manifest.runs.find((run) => run.policy.kind === "fixed")!;
    const adaptiveRun = bundle.manifest.runs.find((run) => run.policy.kind === "adaptive")!;
    const fixed = bundle.outcomesByRun[fixedRun.run_id];
    const adaptive = bundle.outcomesByRun[adaptiveRun.run_id];
    expect(adaptive.utility_per_transmitted_mb).toBeGreaterThan(fixed.utility_per_transmitted_mb);
    expect(adaptive.hard_constraint_violations).toBeLessThan(fixed.hard_constraint_violations);
    expect(adaptive.retained_rare_evidence).toBe(true);
  });
});

describe("multi-scenario public showcase catalog", () => {
  it.each(showcaseFixtures)("validates %s with a measurable adaptive outcome", async (scenarioId) => {
    const root = new URL(`../../../public/fixtures/${scenarioId}/v0.1.0/`, import.meta.url);
    const bundle = await loadFixture(root);
    const fixedRun = bundle.manifest.runs.find((run) => run.policy.kind === "fixed")!;
    const adaptiveRun = bundle.manifest.runs.find((run) => run.policy.kind === "adaptive")!;
    const fixed = bundle.outcomesByRun[fixedRun.run_id];
    const adaptive = bundle.outcomesByRun[adaptiveRun.run_id];

    expect(bundle.manifest.scenario.id).toBe(scenarioId);
    expect(new Set(bundle.manifest.runs.map((run) => run.initial_conditions_digest)).size).toBe(1);
    expect(adaptive.completed).toBe(true);
    expect(adaptive.final_belief).toBeGreaterThan(fixed.final_belief);
    expect(adaptive.utility_per_transmitted_mb).toBeGreaterThan(fixed.utility_per_transmitted_mb);
  });
});
