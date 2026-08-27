export type ValueStatus =
  | "synthetic"
  | "replayed"
  | "derived"
  | "inferred"
  | "counterfactual";

export type EventType =
  | "mission.started"
  | "plan.validated"
  | "observation.acquired"
  | "evidence.produced"
  | "belief.updated"
  | "resource.updated"
  | "constraint.activated"
  | "constraint.cleared"
  | "action.proposed"
  | "action.selected"
  | "action.rejected"
  | "action.started"
  | "action.completed"
  | "action.failed"
  | "action.abstained"
  | "outcome.updated";

export interface PublicRuntimeEvent {
  schema_version: string;
  event_id: string;
  run_id: string;
  comparison_group_id: string;
  seq: number;
  event_time: string;
  sim_time_s: number;
  type: EventType;
  actor: { category: string; id: string };
  correlation_id: string;
  causation_event_ids: string[];
  comparison_key?: string;
  payload: Record<string, unknown>;
  provenance: {
    producer: string;
    producer_version: string;
    value_status: ValueStatus;
  };
}

export interface RunManifest {
  run_id: string;
  policy: { id: string; version: string; kind: "fixed" | "adaptive"; label: string };
  trace_path: string;
  outcome_path: string;
  initial_conditions_digest: string;
}

export interface PublicManifest {
  schema_version: string;
  fixture_id: string;
  title: string;
  scenario: { id: string; version: string; title: string; value_status: ValueStatus };
  comparison_group_id: string;
  clock: { epoch: string; time_unit: string; duration_s: number };
  producer: { id: string; version: string };
  contracts: { manifest: string; event: string; outcome: string };
  runs: RunManifest[];
  attribution: Array<{ title: string; url: string; note: string }>;
  value_status_legend: Record<ValueStatus, string>;
}

export interface TraceBundle {
  manifest: PublicManifest;
  eventsByRun: Record<string, PublicRuntimeEvent[]>;
  outcomesByRun: Record<string, PublicOutcome>;
}

export interface PublicOutcome {
  schema_version: string;
  outcome_id: string;
  run_id: string;
  comparison_group_id: string;
  policy: { id: string; kind: "fixed" | "adaptive"; version: string };
  completed: boolean;
  final_belief: number;
  evidence_threshold: number;
  time_to_knowledge_s: number | null;
  transmitted_mb: number;
  utility_per_transmitted_mb: number;
  hard_constraint_violations: number;
  evidence_completeness: number;
  retained_rare_evidence: boolean;
  summary: string;
  provenance: PublicRuntimeEvent["provenance"];
}
