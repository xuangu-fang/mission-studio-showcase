import type { TraceBundle } from "@mission-studio/contracts";
import { validateBundle } from "@mission-studio/contracts";

export interface PortableRunMetadata {
  export_id: string;
  created_at: string;
  classification: "public";
  producer: { id: string; version: string };
  integrity?: { algorithm: "sha256"; digest: string };
}

export interface ImportedRun {
  schemaVersion: "mission-run-bundle/0.1.0";
  bundle: TraceBundle;
  metadata: PortableRunMetadata;
  researchResult?: Record<string, unknown>;
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} 必须是 JSON object`);
  return value as Record<string, unknown>;
}

const SUPPORTED_SCENARIOS = new Set(["adaptive-hsi", "wildfire-response", "maritime-sar", "la-fires-2025", "la-fires-ablation"]);

function validateRunConsistency(
  manifest: Record<string, unknown>,
  traces: Record<string, unknown>,
  outcomes: Record<string, unknown>
) {
  const scenario = object(manifest.scenario, "manifest.scenario");
  if (typeof scenario.id !== "string" || !SUPPORTED_SCENARIOS.has(scenario.id)) {
    throw new Error(`Showcase 不支持 Research Run 场景：${String(scenario.id ?? "missing")}`);
  }
  if (!Array.isArray(manifest.runs) || typeof manifest.comparison_group_id !== "string") {
    throw new Error("Research Run manifest 缺少 runs 或 comparison_group_id");
  }
  for (const rawRun of manifest.runs) {
    const run = object(rawRun, "manifest.run");
    const policy = object(run.policy, `manifest.run(${String(run.run_id)}).policy`);
    const runId = String(run.run_id ?? "");
    const events = traces[runId];
    const outcome = object(outcomes[runId], `outcomes.${runId}`);
    if (!runId || !Array.isArray(events)) throw new Error(`Research Run ${runId || "missing"} 缺少 event array`);
    const outcomePolicy = object(outcome.policy, `outcomes.${runId}.policy`);
    if (
      outcome.run_id !== runId
      || outcome.comparison_group_id !== manifest.comparison_group_id
      || outcomePolicy.id !== policy.id
      || outcomePolicy.kind !== policy.kind
    ) throw new Error(`Research Run ${runId} 的 outcome 与 manifest policy 不一致`);
    for (const rawEvent of events) {
      const event = object(rawEvent, `traces.${runId}.event`);
      if (event.run_id !== runId || event.comparison_group_id !== manifest.comparison_group_id) {
        throw new Error(`Research Run ${runId} 的 event identity 与 manifest 不一致`);
      }
      if (event.type === "mission.started") {
        const payload = object(event.payload, `traces.${runId}.mission.started.payload`);
        if (payload.policy_id !== policy.id || payload.policy_kind !== policy.kind) {
          throw new Error(`Research Run ${runId} 的 mission policy 与 manifest 不一致`);
        }
      }
    }
  }
}

export function parsePortableRunText(text: string): ImportedRun {
  const root = object(JSON.parse(text), "Research Run");
  if (root.schema_version !== "mission-run-bundle/0.1.0") {
    throw new Error(`不支持的 Research Run 契约：${String(root.schema_version ?? "missing")}`);
  }
  const metadata = object(root.export_metadata, "export_metadata");
  const producer = object(metadata.producer, "export_metadata.producer");
  if (metadata.classification !== "public") throw new Error("只允许导入 classification=public 的清理后产物");
  if (typeof metadata.export_id !== "string" || typeof metadata.created_at !== "string") throw new Error("Research Run 缺少稳定 export ID 或时间");
  if (typeof producer.id !== "string" || typeof producer.version !== "string") throw new Error("Research Run 缺少 producer 版本");
  if (metadata.integrity !== undefined) {
    const integrity = object(metadata.integrity, "export_metadata.integrity");
    if (integrity.algorithm !== "sha256" || typeof integrity.digest !== "string" || !/^[a-f0-9]{64}$/.test(integrity.digest)) {
      throw new Error("Research Run integrity 声明必须是 SHA-256 digest");
    }
  }
  const manifest = object(root.manifest, "manifest");
  const traces = object(root.traces, "traces");
  const outcomes = object(root.outcomes, "outcomes");
  validateRunConsistency(manifest, traces, outcomes);
  const traceInputs = Object.fromEntries(Object.entries(traces).map(([runId, events]) => {
    if (!Array.isArray(events)) throw new Error(`Trace ${runId} 必须是 event array`);
    return [runId, events];
  }));
  const researchResult = root.research_result === undefined ? undefined : object(root.research_result, "research_result");
  return {
    schemaVersion: "mission-run-bundle/0.1.0",
    bundle: validateBundle(manifest, traceInputs, outcomes),
    metadata: metadata as unknown as PortableRunMetadata,
    researchResult
  };
}
