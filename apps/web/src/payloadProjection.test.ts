import { describe, expect, it } from "vitest";
import { payloadState } from "./payloadProjection";

describe("payload projection", () => {
  it("maps trace events to deterministic payload phases", () => {
    expect(payloadState("mission.started", "", false, false, false).phase).toBe("standby");
    expect(payloadState("action.started", "observe", false, false, false).phase).toBe("acquiring");
    expect(payloadState("observation.acquired", "observe", false, false, false).phase).toBe("frame-lock");
    expect(payloadState("evidence.produced", "process", true, false, false).phase).toBe("analyzing");
    expect(payloadState("belief.updated", "process", true, true, false).phase).toBe("fused");
    expect(payloadState("outcome.updated", "downlink", true, true, false).phase).toBe("confirmed");
  });

  it("preserves the frame while explicitly labeling a link outage", () => {
    const state = payloadState("constraint.activated", "retain", true, false, true);
    expect(state.showEvidence).toBe(true);
    expect(state.linkOffline).toBe(true);
    expect(state.phase).toBe("analyzing");
  });
});
