import { describe, expect, it } from "vitest";
import { causalStepIndex, storyBeat, storyFocusEvent, storyStageIndex, storyStages } from "./storyModel";

describe("story model", () => {
  it("maps the five narrative stages into four monotonic causal highlights", () => {
    expect([0, 1, 2, 3, 4].map(causalStepIndex)).toEqual([0, 1, 2, 2, 3]);
  });
  it("maps both policies onto the same five semantic stages", () => {
    expect(storyStages("adaptive").map((stage) => stage.label)).toEqual([
      "任务意图", "首次观测", "证据判断", "约束决策", "形成结论"
    ]);
    expect(storyStages("adaptive")[4]?.anchorTime).toBe(38);
    expect(storyStages("fixed")[4]?.anchorTime).toBe(40);
    expect(storyStageIndex("adaptive", 20)).toBe(3);
  });

  it("selects the meaningful story event when several events share a timestamp", () => {
    const events = [
      { sim_time_s: 20, type: "action.selected" },
      { sim_time_s: 20, type: "resource.updated" },
      { sim_time_s: 20, type: "constraint.activated" }
    ];
    expect(storyFocusEvent(events, 20)?.type).toBe("constraint.activated");
  });

  it("explains policy divergence instead of only showing event labels", () => {
    const adaptive = storyBeat("adaptive-hsi", "adaptive", 20, 0.62, 0.75, 50);
    const fixed = storyBeat("adaptive-hsi", "fixed", 20, 0.62, 0.75, 50);
    expect(adaptive.response).toContain("保留");
    expect(fixed.response).toContain("尝试下传");
    expect(storyBeat("adaptive-hsi", "adaptive", 50, 0.91, 0.75, 50).tone).toBe("success");
  });

  it("derives stage anchors from each scenario trace", () => {
    const events = [
      { sim_time_s: 0, type: "mission.started" },
      { sim_time_s: 8, type: "observation.acquired" },
      { sim_time_s: 14, type: "belief.updated" },
      { sim_time_s: 27, type: "constraint.activated" },
      { sim_time_s: 43, type: "observation.acquired" }
    ];
    expect(storyStages("adaptive", events).map((stage) => stage.anchorTime)).toEqual([0, 8, 14, 27, 43]);
  });
});
