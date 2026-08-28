import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parsePortableRunText } from "./runSource";

const fixtureRoot = new URL("../../../public/fixtures/adaptive-hsi/v0.1.0/", import.meta.url);

function validEnvelope() {
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", fixtureRoot), "utf8"));
  const traces = Object.fromEntries(manifest.runs.map((run: { run_id: string; trace_path: string }) => [
    run.run_id,
    readFileSync(new URL(run.trace_path, fixtureRoot), "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line))
  ]));
  const outcomes = Object.fromEntries(manifest.runs.map((run: { run_id: string; outcome_path: string }) => [
    run.run_id,
    JSON.parse(readFileSync(new URL(run.outcome_path, fixtureRoot), "utf8"))
  ]));
  return {
    schema_version: "mission-run-bundle/0.1.0",
    export_metadata: {
      export_id: "export-adaptive-hsi-test",
      created_at: "2026-08-28T00:00:00Z",
      classification: "public",
      producer: { id: "mission-studio-core", version: "0.1.0" }
    },
    manifest,
    traces,
    outcomes
  };
}

describe("portable Research Run", () => {
  it("imports the checked 64-seed Belief-to-Evidence demo artifact end to end", () => {
    const path = new URL("../../../public/research/mission-b2e-benchmark.missionrun", import.meta.url);
    const imported = parsePortableRunText(readFileSync(path, "utf8"));
    expect(imported.metadata.producer.id).toBe("mission-belief-to-evidence");
    expect(imported.researchResult?.schema_version).toBe("mission-belief-to-evidence.research-result/1.0.0");
    expect(Object.keys(imported.bundle.eventsByRun)).toHaveLength(2);
  });

  it("imports a sanitized bundle through the same contract validator as fixtures", () => {
    const imported = parsePortableRunText(JSON.stringify(validEnvelope()));
    expect(imported.bundle.manifest.fixture_id).toBe("adaptive-hsi-policy-comparison-v0");
    expect(Object.keys(imported.bundle.eventsByRun)).toHaveLength(2);
  });

  it("rejects internal classifications before parsing mission data", () => {
    const envelope = validEnvelope();
    envelope.export_metadata.classification = "internal";
    expect(() => parsePortableRunText(JSON.stringify(envelope))).toThrow("classification=public");
  });

  it("rejects a policy identity mismatch across manifest and outcome", () => {
    const envelope = validEnvelope();
    const adaptiveRun = envelope.manifest.runs.find((run: { policy: { kind: string } }) => run.policy.kind === "adaptive");
    envelope.outcomes[adaptiveRun.run_id].policy.id = "dp-oracle";
    expect(() => parsePortableRunText(JSON.stringify(envelope))).toThrow("outcome 与 manifest policy 不一致");
  });

  it("rejects unknown visual scenarios instead of silently applying the previous scene", () => {
    const envelope = validEnvelope();
    envelope.manifest.scenario.id = "unknown-research-scene";
    expect(() => parsePortableRunText(JSON.stringify(envelope))).toThrow("不支持 Research Run 场景");
  });
});
