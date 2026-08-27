import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { PublicManifest, PublicOutcome, PublicRuntimeEvent, TraceBundle } from "./types";
import eventSchema from "../schemas/0.1.0/event.schema.json";
import manifestSchema from "../schemas/0.1.0/manifest.schema.json";
import outcomeSchema from "../schemas/0.1.0/outcome.schema.json";

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const schemaValidateEvent = ajv.compile(eventSchema);
const schemaValidateManifest = ajv.compile(manifestSchema);
const schemaValidateOutcome = ajv.compile(outcomeSchema);

const EVENT_TYPES = new Set([
  "mission.started",
  "plan.validated",
  "observation.acquired",
  "evidence.produced",
  "belief.updated",
  "resource.updated",
  "constraint.activated",
  "constraint.cleared",
  "action.proposed",
  "action.selected",
  "action.rejected",
  "action.started",
  "action.completed",
  "action.failed",
  "action.abstained",
  "outcome.updated"
]);

const ALLOWED_PAYLOAD_KEYS = new Set([
  "mission_id", "objective", "area_of_interest", "success_gate", "deadline_s",
  "plan_id", "actions", "constraints", "observation_id", "label", "footprint",
  "quality", "evidence_id", "claim", "direction", "score", "observation_ids",
  "method", "hypothesis", "threshold", "threshold_state", "unknowns", "evidence_ids",
  "resources", "constraint_code", "constraint_label", "action_id", "action_type",
  "candidates", "selected_action_type", "reason_codes", "resource_event_id",
  "policy_version", "status", "completed", "time_to_knowledge_s",
  "utility_per_transmitted_bit", "hard_constraint_violations",
  "evidence_completeness", "retained_rare_evidence", "abstained", "summary",
  "policy_id", "policy_kind", "policy_version", "seed", "graph_id", "action_count",
  "validation_layers", "storage_used_mb", "storage_capacity_mb", "downlink_used_mb",
  "downlink_budget_mb", "compute_used_units", "network_available", "belief", "reason",
  "evidence_event_ids", "source_label", "rare_evidence", "belief_delta", "previous_belief",
  "gate_passed", "constraint_id", "kind", "final_belief", "transmitted_mb", "outcome_id"
]);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateManifest(value: unknown): asserts value is PublicManifest {
  assert(schemaValidateManifest(value), `Manifest schema rejected: ${ajv.errorsText(schemaValidateManifest.errors)}`);
  assert(isObject(value), "Manifest must be an object");
  assert(value.schema_version === "0.1.0", `Unsupported public contract ${String(value.schema_version)}`);
  assert(typeof value.fixture_id === "string", "Manifest fixture_id is required");
  assert(isObject(value.scenario), "Manifest scenario is required");
  assert(typeof value.comparison_group_id === "string", "Manifest comparison_group_id is required");
  assert(isObject(value.clock) && typeof value.clock.duration_s === "number", "Manifest clock is invalid");
  assert(Array.isArray(value.attribution) && value.attribution.length > 0, "Manifest attribution is required");
  assert(Array.isArray(value.runs) && value.runs.length === 2, "Manifest requires a fixed/adaptive run pair");
  const kinds = new Set(value.runs.map((run) => isObject(run) && isObject(run.policy) ? run.policy.kind : undefined));
  assert(kinds.has("fixed") && kinds.has("adaptive"), "Manifest must include fixed and adaptive policies");
  const digests = new Set(value.runs.map((run) => isObject(run) ? run.initial_conditions_digest : undefined));
  assert(digests.size === 1, "Compared runs must share initial conditions");
}

function validateEventShape(value: unknown): asserts value is PublicRuntimeEvent {
  assert(schemaValidateEvent(value), `Runtime event schema rejected: ${ajv.errorsText(schemaValidateEvent.errors)}`);
  assert(isObject(value), "Runtime event must be an object");
  assert(value.schema_version === "0.1.0", `Unsupported event contract ${String(value.schema_version)}`);
  for (const key of ["event_id", "run_id", "comparison_group_id", "event_time", "correlation_id"]) {
    assert(typeof value[key] === "string", `Runtime event ${key} is required`);
  }
  assert(Number.isInteger(value.seq) && Number(value.seq) >= 0, "Runtime event seq must be a non-negative integer");
  assert(typeof value.sim_time_s === "number" && Number(value.sim_time_s) >= 0, "Runtime event sim_time_s is invalid");
  assert(typeof value.type === "string" && EVENT_TYPES.has(value.type), `Unsupported event type ${String(value.type)}`);
  assert(isObject(value.actor) && typeof value.actor.category === "string" && typeof value.actor.id === "string", "Runtime event actor is invalid");
  assert(Array.isArray(value.causation_event_ids) && value.causation_event_ids.every((item) => typeof item === "string"), "Runtime event causation is invalid");
  assert(isObject(value.provenance), "Runtime event provenance is required");
  assert(isObject(value.payload), "Runtime event payload is required");
  for (const key of Object.keys(value.payload)) {
    assert(ALLOWED_PAYLOAD_KEYS.has(key), `Public payload field is not allowlisted: ${key}`);
  }
}

export function validateTrace(events: unknown[], expectedRunId: string): PublicRuntimeEvent[] {
  const seen = new Set<string>();
  let previousTime = -1;
  return events.map((value, index) => {
    validateEventShape(value);
    assert(value.run_id === expectedRunId, `Trace contains an event from run ${value.run_id}`);
    assert(value.seq === index, `Trace sequence gap at ${index}`);
    assert(value.sim_time_s >= previousTime, `Trace time regressed at seq ${value.seq}`);
    assert(!seen.has(value.event_id), `Duplicate event id ${value.event_id}`);
    for (const cause of value.causation_event_ids) {
      assert(seen.has(cause), `Event ${value.event_id} references a missing or future cause`);
    }
    seen.add(value.event_id);
    previousTime = value.sim_time_s;
    return value;
  });
}

export function validateBundle(manifestInput: unknown, traceInputs: Record<string, unknown[]>, outcomeInputs: Record<string, unknown>): TraceBundle {
  validateManifest(manifestInput);
  const eventsByRun: Record<string, PublicRuntimeEvent[]> = {};
  const outcomesByRun: Record<string, PublicOutcome> = {};
  for (const run of manifestInput.runs) {
    assert(isObject(run) && typeof run.run_id === "string", "Run manifest is invalid");
    assert(Array.isArray(traceInputs[run.run_id]), `Missing trace for ${run.run_id}`);
    eventsByRun[run.run_id] = validateTrace(traceInputs[run.run_id], run.run_id);
    const outcome = outcomeInputs[run.run_id];
    assert(schemaValidateOutcome(outcome), `Outcome schema rejected for ${run.run_id}: ${ajv.errorsText(schemaValidateOutcome.errors)}`);
    assert(isObject(outcome) && outcome.schema_version === "0.1.0" && outcome.run_id === run.run_id, `Invalid outcome for ${run.run_id}`);
    outcomesByRun[run.run_id] = outcome as unknown as PublicOutcome;
  }
  return { manifest: manifestInput, eventsByRun, outcomesByRun };
}

export function parseJsonLines(text: string): unknown[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line));
}
