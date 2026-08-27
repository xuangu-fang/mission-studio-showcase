import { describe, expect, it } from "vitest";
import { validateTrace } from "./validate";

const event = (seq: number, causes: string[] = []) => ({
  schema_version: "0.1.0",
  event_id: `evt-${seq}`,
  run_id: "run-fixed",
  comparison_group_id: "cmp-1",
  seq,
  event_time: `2026-01-01T00:00:${String(seq).padStart(2, "0")}Z`,
  sim_time_s: seq,
  type: "mission.started",
  actor: { category: "engine", id: "mission-engine" },
  correlation_id: "mission-1",
  causation_event_ids: causes,
  payload: {
    mission_id: "mission-1", objective: "test", area_of_interest: [0, 0, 1, 1],
    success_gate: 0.8, deadline_s: 60, policy_id: "fixed-v0", policy_kind: "fixed",
    policy_version: "0.1.0", seed: 7
  },
  provenance: { producer: "test", producer_version: "0.1.0", value_status: "synthetic" }
});

describe("validateTrace", () => {
  it("accepts an ordered causal trace", () => {
    expect(validateTrace([event(0), event(1, ["evt-0"])], "run-fixed")).toHaveLength(2);
  });

  it("rejects sequence gaps", () => {
    expect(() => validateTrace([event(0), event(2)], "run-fixed")).toThrow(/sequence gap/i);
  });

  it("rejects private payload keys", () => {
    const leaked = event(0) as typeof event extends (...args: never[]) => infer R ? R : never;
    (leaked.payload as Record<string, unknown>).raw_model_response = "secret";
    expect(() => validateTrace([leaked], "run-fixed")).toThrow(/schema rejected|allowlisted/i);
  });
});
