import type { PublicRuntimeEvent } from "@mission-studio/contracts";

export interface MissionProjection {
  objective: string;
  areaOfInterest: number[];
  successGate: number;
  actions: Array<{ id: string; type: string; depends_on?: string[] }>;
  observation?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  belief?: Record<string, unknown>;
  resources: Array<Record<string, unknown>>;
  activeConstraints: string[];
  decision?: Record<string, unknown>;
  outcome?: Record<string, unknown>;
  currentEvent?: PublicRuntimeEvent;
}

const initialProjection = (): MissionProjection => ({
  objective: "Loading mission intent…",
  areaOfInterest: [],
  successGate: 0,
  actions: [],
  resources: [],
  activeConstraints: []
});

export function projectEvents(events: PublicRuntimeEvent[], simTimeS: number): MissionProjection {
  const state = initialProjection();
  for (const event of events) {
    if (event.sim_time_s > simTimeS) break;
    const payload = event.payload;
    switch (event.type) {
      case "mission.started":
        state.objective = String(payload.objective ?? state.objective);
        state.areaOfInterest = Array.isArray(payload.area_of_interest) ? payload.area_of_interest as number[] : [];
        state.successGate = Number(payload.success_gate ?? 0);
        break;
      case "plan.validated":
        state.actions = Array.isArray(payload.actions) ? payload.actions as MissionProjection["actions"] : [];
        break;
      case "observation.acquired": state.observation = payload; break;
      case "evidence.produced": state.evidence = payload; break;
      case "belief.updated": state.belief = payload; break;
      case "resource.updated":
        state.resources = Array.isArray(payload.resources) ? payload.resources as Array<Record<string, unknown>> : [
          { name: "storage", normalized_value: Number(payload.storage_used_mb ?? 0) / Math.max(1, Number(payload.storage_capacity_mb ?? 1)), state: Number(payload.storage_used_mb ?? 0) / Math.max(1, Number(payload.storage_capacity_mb ?? 1)) >= 0.8 ? "warning" : "nominal" },
          { name: "downlink", normalized_value: Number(payload.downlink_used_mb ?? 0) / Math.max(1, Number(payload.downlink_budget_mb ?? 1)), state: "nominal" },
          { name: "compute", normalized_value: Math.min(1, Number(payload.compute_used_units ?? 0) / 8), state: "nominal" },
          { name: "contact", normalized_value: payload.network_available ? 1 : 0, state: payload.network_available ? "available" : "unavailable" }
        ];
        break;
      case "constraint.activated":
        state.activeConstraints = [...new Set([...state.activeConstraints, String(payload.constraint_id ?? payload.constraint_code)])];
        break;
      case "constraint.cleared":
        state.activeConstraints = state.activeConstraints.filter((item) => item !== String(payload.constraint_id ?? payload.constraint_code));
        break;
      case "action.proposed":
      case "action.selected":
      case "action.rejected":
      case "action.started":
      case "action.completed":
      case "action.failed":
      case "action.abstained": state.decision = { ...payload, event_type: event.type }; break;
      case "outcome.updated": state.outcome = payload; break;
    }
    state.currentEvent = event;
  }
  return state;
}

export function causalChain(events: PublicRuntimeEvent[], eventId: string): PublicRuntimeEvent[] {
  const byId = new Map(events.map((event) => [event.event_id, event]));
  const collected = new Set<string>();
  const visit = (id: string) => {
    if (collected.has(id)) return;
    const event = byId.get(id);
    if (!event) return;
    event.causation_event_ids.forEach(visit);
    collected.add(id);
  };
  visit(eventId);
  return [...collected].map((id) => byId.get(id)!).sort((a, b) => a.seq - b.seq);
}
