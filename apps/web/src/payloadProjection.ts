export type PayloadPhase = "standby" | "acquiring" | "frame-lock" | "analyzing" | "fused" | "transmitting" | "confirmed";

export interface PayloadState {
  phase: PayloadPhase;
  label: string;
  detail: string;
  scanning: boolean;
  showEvidence: boolean;
  compareFrames: boolean;
  linkOffline: boolean;
}

export function payloadState(
  eventType: string,
  actionType: string,
  hasEvidence: boolean,
  beliefPassed: boolean,
  linkOffline: boolean,
  observationCount = 0
): PayloadState {
  let phase: PayloadPhase = hasEvidence ? "analyzing" : "standby";
  if (["observe", "revisit", "process"].includes(actionType)) phase = "acquiring";
  if (eventType === "observation.acquired") phase = "frame-lock";
  if (eventType === "evidence.produced") phase = "analyzing";
  if (eventType === "belief.updated") phase = "fused";
  if (actionType === "downlink" && eventType.startsWith("action.")) phase = "transmitting";
  if (eventType === "outcome.updated" && beliefPassed) phase = "confirmed";

  const copy: Record<PayloadPhase, [string, string]> = {
    standby: ["载荷待机", "正在接近目标观测窗口"],
    acquiring: ["传感器采集", "视场稳定，扫描线正在推进"],
    "frame-lock": observationCount >= 2
      ? ["重访帧已锁定", "与首次观测对齐，准备比较新旧证据"]
      : ["首次观测已冻结", "停止扫描，检查这张观测是否足以支持结论"],
    analyzing: ["关键证据已框选", "画面已冻结；只突出会改变结论的区域"],
    fused: ["判断已经更新", beliefPassed ? "新证据使当前把握越过完成门槛" : "当前证据仍不足，系统不会过早下结论"],
    transmitting: ["证据下传", linkOffline ? "链路不可用，数据保持在轨" : "紧凑 evidence packet 正在下传"],
    confirmed: ["结论确认", "证据、Belief 与任务结果已对齐"]
  };
  const [label, detail] = copy[phase];
  return {
    phase,
    label,
    detail,
    scanning: phase === "acquiring",
    showEvidence: hasEvidence || ["analyzing", "fused", "transmitting", "confirmed"].includes(phase),
    compareFrames: observationCount >= 2 && ["frame-lock", "analyzing", "fused", "transmitting", "confirmed"].includes(phase),
    linkOffline
  };
}
