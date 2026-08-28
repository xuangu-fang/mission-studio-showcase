export type PayloadPhase = "standby" | "acquiring" | "frame-lock" | "analyzing" | "fused" | "transmitting" | "confirmed";

export interface PayloadState {
  phase: PayloadPhase;
  label: string;
  detail: string;
  scanning: boolean;
  showEvidence: boolean;
  linkOffline: boolean;
}

export function payloadState(
  eventType: string,
  actionType: string,
  hasEvidence: boolean,
  beliefPassed: boolean,
  linkOffline: boolean
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
    "frame-lock": ["帧已锁定", "观测 footprint 已写入 Runtime Trace"],
    analyzing: ["证据分析", "合成光谱特征正在被标记"],
    fused: ["证据融合", beliefPassed ? "Belief 已越过任务门" : "仍需新的判别性证据"],
    transmitting: ["证据下传", linkOffline ? "链路不可用，数据保持在轨" : "紧凑 evidence packet 正在下传"],
    confirmed: ["结论确认", "证据、Belief 与任务结果已对齐"]
  };
  const [label, detail] = copy[phase];
  return {
    phase,
    label,
    detail,
    scanning: phase === "acquiring" || phase === "frame-lock",
    showEvidence: hasEvidence || ["analyzing", "fused", "transmitting", "confirmed"].includes(phase),
    linkOffline
  };
}
