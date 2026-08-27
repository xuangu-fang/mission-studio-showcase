import { describe, expect, it } from "vitest";
import type { PublicRuntimeEvent } from "@mission-studio/contracts";
import { projectEvents } from "./projection";

const base = {
  schema_version: "0.1.0", run_id: "run", comparison_group_id: "cmp", event_time: "2026-01-01T00:00:00Z",
  actor: { category: "engine", id: "engine" }, correlation_id: "mission", causation_event_ids: [],
  provenance: { producer: "test", producer_version: "0.1.0", value_status: "synthetic" as const }
};

const events: PublicRuntimeEvent[] = [
  { ...base, event_id: "e1", seq: 1, sim_time_s: 0, type: "mission.started", payload: { objective: "Find evidence", area_of_interest: [1, 2, 3, 4], success_gate: 0.8 } },
  { ...base, event_id: "e2", seq: 2, sim_time_s: 10, type: "belief.updated", payload: { hypothesis: "target", score: 0.62 } }
];

describe("projectEvents", () => {
  it("recomputes state from an event prefix", () => {
    expect(projectEvents(events, 5).belief).toBeUndefined();
    expect(projectEvents(events, 10).belief?.score).toBe(0.62);
    expect(projectEvents(events, 5)).toEqual(projectEvents(events, 5));
  });
});
