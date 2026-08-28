export type StoryPolicyKind = "fixed" | "adaptive";
export type StoryScenarioId = "adaptive-hsi" | "wildfire-response" | "maritime-sar";

type StoryEventLike = { sim_time_s: number; type: string };

export interface StoryStage {
  id: string;
  label: string;
  anchorTime: number;
}

export interface StoryBeat {
  eyebrow: string;
  title: string;
  why: string;
  response: string;
  impact: string;
  tone: "plan" | "evidence" | "warning" | "success";
}

export function storyStages(policy: StoryPolicyKind, events: StoryEventLike[] = []): StoryStage[] {
  const firstTime = (types: string[], after = -1) => events.find(
    (event) => event.sim_time_s > after && types.includes(event.type)
  )?.sim_time_s;
  const firstObservation = firstTime(["observation.acquired"]) ?? 5;
  const firstEvidence = firstTime(["belief.updated", "evidence.produced"], firstObservation - 0.1) ?? 10;
  const firstConstraint = firstTime(["constraint.activated"], firstEvidence - 0.1) ?? 20;
  const adaptiveResponse = firstTime(
    ["observation.acquired", "constraint.cleared"],
    firstConstraint
  ) ?? (policy === "adaptive" ? 38 : 40);
  return [
    { id: "intent", label: "任务意图", anchorTime: 0 },
    { id: "observe", label: "首次观测", anchorTime: firstObservation },
    { id: "evidence", label: "证据判断", anchorTime: firstEvidence },
    { id: "constraint", label: "约束决策", anchorTime: firstConstraint },
    { id: "conclusion", label: "形成结论", anchorTime: adaptiveResponse }
  ];
}

export function storyStageIndex(policy: StoryPolicyKind, simTime: number, events: StoryEventLike[] = []): number {
  return storyStages(policy, events).reduce(
    (active, stage, index) => simTime >= stage.anchorTime ? index : active,
    0
  );
}

export function causalStepIndex(storyStage: number): number {
  if (storyStage <= 0) return 0;
  if (storyStage === 1) return 1;
  if (storyStage <= 3) return 2;
  return 3;
}

const EVENT_PRIORITY: Record<string, number> = {
  "outcome.updated": 100,
  "constraint.activated": 90,
  "belief.updated": 80,
  "evidence.produced": 70,
  "observation.acquired": 60,
  "action.rejected": 55,
  "constraint.cleared": 50,
  "action.selected": 40,
  "plan.validated": 30,
  "mission.started": 20,
  "resource.updated": 10
};

export function storyFocusEvent<T extends { sim_time_s: number; type: string }>(events: T[], simTime: number): T | undefined {
  const visible = events.filter((event) => event.sim_time_s <= simTime);
  if (!visible.length) return undefined;
  const latestTime = Math.max(...visible.map((event) => event.sim_time_s));
  return visible
    .filter((event) => event.sim_time_s === latestTime)
    .sort((left, right) => (EVENT_PRIORITY[right.type] ?? 0) - (EVENT_PRIORITY[left.type] ?? 0))[0];
}

export function storyBeat(
  scenarioId: StoryScenarioId,
  policy: StoryPolicyKind,
  simTime: number,
  beliefScore: number,
  gate: number,
  maxTime: number,
  events: StoryEventLike[] = []
): StoryBeat {
  const beliefPercent = Math.round(beliefScore * 100);
  const gatePercent = Math.round(gate * 100);

  if (simTime >= maxTime - 0.1) {
    if (scenarioId === "wildfire-response") {
      return {
        eyebrow: "任务复盘 / OUTCOME",
        title: "火场态势已经形成可行动结论",
        why: `融合证据越过 ${gatePercent}% 任务门，响应团队获得可追溯的火线判断。`,
        response: policy === "adaptive" ? "系统绕开受烟云影响的单一观测，融合跨传感器证据并优先下传变化区域。" : "系统完成预排观测序列后下传火场数据。",
        impact: policy === "adaptive" ? "更早形成结论，且没有违反通信约束。" : "任务形成结论，但错过一次更早的响应窗口。",
        tone: "success"
      };
    }
    if (scenarioId === "maritime-sar") {
      return {
        eyebrow: "任务复盘 / OUTCOME",
        title: "搜索区域已经收敛到可救援范围",
        why: `信标、视觉线索与资源状态共同将置信度推过 ${gatePercent}% 任务门。`,
        response: policy === "adaptive" ? "系统缩小搜索网格，把有限燃料留给高价值确认与救援引导。" : "系统完成固定搜索航线后汇总全部观测。",
        impact: policy === "adaptive" ? "以更少搜索消耗获得更快确认。" : "目标最终被确认，但资源效率较低。",
        tone: "success"
      };
    }
    return {
      eyebrow: "任务复盘 / OUTCOME",
      title: "证据闭环已经完成",
      why: `最终置信度越过 ${gatePercent}% 任务门，并完成关键证据下传。`,
      response: policy === "adaptive" ? "系统用重访补齐不确定性，只下传支持结论的紧凑证据包。" : "系统在链路恢复后完成预排观测、处理与下传。",
      impact: policy === "adaptive" ? "任务完成，硬约束违规为 0。" : "任务完成，但过程中产生 1 次硬约束违规。",
      tone: "success"
    };
  }

  const stage = storyStageIndex(policy, simTime, events);

  if (scenarioId === "wildfire-response") {
    const wildfireBeats: StoryBeat[] = [
      {
        eyebrow: "阶段 1 / INCIDENT INTENT", title: "告警被编译为可审计的响应任务",
        why: `目标不是收集更多影像，而是在截止时间前以 ${gatePercent}% 置信度判断火线是否越过控制线。`,
        response: "锁定火场 AOI、通信窗口、可用传感器和应急响应权限。",
        impact: "Fixed 与 Adaptive 从同一火场态势与资源基线出发。", tone: "plan"
      },
      {
        eyebrow: "阶段 2 / THERMAL OBSERVATION", title: "轨道传感器捕获第一幅火场观测",
        why: "热异常可能来自真实火线，也可能被烟云、地表高温或观测角度混淆。",
        response: "提取热点与火线候选，并把空间 footprint 绑定到 Evidence。",
        impact: "系统获得第一份可用于更新火势判断的证据。", tone: "evidence"
      },
      {
        eyebrow: "阶段 3 / EVIDENCE GATE", title: `首轮证据将火线假设推至 ${beliefPercent}%`,
        why: `证据尚${beliefScore >= gate ? "已" : "未"}越过 ${gatePercent}% 任务门，烟云遮挡仍是关键未知。`,
        response: beliefScore >= gate ? "准备形成火场结论。" : "评估跨传感器确认是否比重复同源观测更有价值。",
        impact: beliefScore >= gate ? "响应团队可以行动。" : "计划必须根据证据质量发生变化。", tone: beliefScore >= gate ? "success" : "evidence"
      },
      policy === "adaptive" ? {
        eyebrow: "阶段 4 / CONSTRAINT-AWARE RESPONSE", title: "烟云与链路窗口同时压缩决策空间",
        why: "单一热红外观测不够可靠，当前通信窗口也不足以传输完整场景。",
        response: "Adaptive Policy 请求跨传感器确认，并保留高价值火线变化片段。",
        impact: "用证据价值而不是数据体积决定下一行动。", tone: "warning"
      } : {
        eyebrow: "阶段 4 / FIXED RESPONSE", title: "固定计划继续等待下一次同源观测",
        why: "预排序列无法主动利用新的烟云与链路信息。",
        response: "Fixed Policy 保持原采集与全量下传顺序。",
        impact: "形成结论所需时间增加，通信资源利用率降低。", tone: "warning"
      },
      {
        eyebrow: "阶段 5 / MULTI-SENSOR CONFIRMATION", title: "增量证据确认火线正在扩张",
        why: `当前融合 Belief 为 ${beliefPercent}%，关键未知正在被跨传感器观测消除。`,
        response: policy === "adaptive" ? "只下传发生变化的控制线片段与支持证据。" : "完成预排后续观测并汇总。",
        impact: "火场数据被转化为可解释、可授权的响应结论。", tone: "evidence"
      }
    ];
    return wildfireBeats[stage]!;
  }

  if (scenarioId === "maritime-sar") {
    const sarBeats: StoryBeat[] = [
      {
        eyebrow: "阶段 1 / SEARCH INTENT", title: "遇险告警被编译为资源受限搜索任务",
        why: `系统必须在燃料与通信窗口内，把目标位置置信度推过 ${gatePercent}%。`,
        response: "建立优先搜索区、资产能力、燃料预算和人工升级边界。",
        impact: "两种 Policy 共享同一目标分布和初始资源。", tone: "plan"
      },
      {
        eyebrow: "阶段 2 / SEARCH PASS", title: "搜索资产完成第一轮区域扫描",
        why: "单个弱信标或视觉候选可能是误报，不能直接触发救援调度。",
        response: "将候选位置、质量与搜索 footprint 记录为可追溯 Observation。",
        impact: "初始搜索区开始收缩。", tone: "evidence"
      },
      {
        eyebrow: "阶段 3 / FUSION GATE", title: `多源线索将目标假设推至 ${beliefPercent}%`,
        why: `距离 ${gatePercent}% 救援调度门仍${beliefScore >= gate ? "无" : "有"}缺口。`,
        response: beliefScore >= gate ? "准备引导救援资产。" : "比较继续网格搜索、重访与请求外部确认的价值。",
        impact: beliefScore >= gate ? "目标位置可以授权行动。" : "剩余燃料必须用于最高信息增益区域。", tone: beliefScore >= gate ? "success" : "evidence"
      },
      policy === "adaptive" ? {
        eyebrow: "阶段 4 / RESOURCE-AWARE SEARCH", title: "燃料与通信窗口迫使搜索策略收缩",
        why: "继续覆盖完整网格会耗尽资源，也无法及时传回关键候选。",
        response: "Adaptive Policy 保留强信号，放弃低价值网格并请求针对性重访。",
        impact: "搜索从面积最大化转向信息增益最大化。", tone: "warning"
      } : {
        eyebrow: "阶段 4 / FIXED SEARCH", title: "固定航线继续覆盖低概率网格",
        why: "计划没有使用最新 Belief 调整剩余搜索资源。",
        response: "Fixed Policy 按预设顺序继续扫描。",
        impact: "燃料与认知时间余量被进一步压缩。", tone: "warning"
      },
      {
        eyebrow: "阶段 5 / TARGET CONFIRMATION", title: "高价值重访把搜索区收敛到救援范围",
        why: `当前目标 Belief 为 ${beliefPercent}%，新的视觉确认正在消除误报。`,
        response: policy === "adaptive" ? "下传紧凑目标位置包并引导救援资产。" : "完成固定航线后汇总候选。",
        impact: "线索被转化为可授权的救援行动。", tone: "evidence"
      }
    ];
    return sarBeats[stage]!;
  }

  switch (stage) {
    case 0:
      return {
        eyebrow: "阶段 1 / MISSION INTENT",
        title: "任务目标被编译为可执行行动图",
        why: `系统不仅要找到目标，还必须在截止时间前越过 ${gatePercent}% 证据门。`,
        response: "验证 Action Graph，并锁定相同的任务时钟、初始资源与完成判据。",
        impact: "Fixed 与 Adaptive 从完全相同的初始状态出发。",
        tone: "plan"
      };
    case 1:
      return {
        eyebrow: "阶段 2 / OBSERVATION",
        title: "卫星完成首次 HSI 观测",
        why: "空间观测本身还不是结论，必须经过处理并转化为可追溯 Evidence。",
        response: "记录 AOI footprint，处理光谱特征，并同步更新资源状态。",
        impact: "任务获得第一份可用于更新 Belief 的证据。",
        tone: "evidence"
      };
    case 2:
      return {
        eyebrow: "阶段 3 / EVIDENCE GATE",
        title: `首次证据将置信度推至 ${beliefPercent}%`,
        why: beliefScore >= gate ? "证据已经越过任务门，可以准备形成结论。" : `距离 ${gatePercent}% 任务门仍有缺口，直接结束会留下关键不确定性。`,
        response: beliefScore >= gate ? "准备选择最小充分证据包并完成下传。" : "继续评估证据、链路与资源余量，等待下一项可授权行动。",
        impact: beliefScore >= gate ? "任务门已通过。" : "计划必须根据新信息继续演化。",
        tone: beliefScore >= gate ? "success" : "evidence"
      };
    case 3:
      return policy === "adaptive" ? {
        eyebrow: "阶段 4 / CONSTRAINT-AWARE DECISION",
        title: "下传链路进入中断窗口",
        why: "当前证据无法安全下传；强行执行会触发确定性授权器拒绝。",
        response: "Adaptive Policy 保留并压缩稀缺证据，等待链路恢复后安排轻量重访。",
        impact: "信息被保住，同时避免一次硬约束违规。",
        tone: "warning"
      } : {
        eyebrow: "阶段 4 / FIXED SCHEDULE",
        title: "下传链路进入中断窗口",
        why: "预排计划没有根据实时链路状态调整下一行动。",
        response: "Fixed Policy 仍尝试下传，确定性授权器拒绝该行动。",
        impact: "任务记录一次硬约束违规，并等待原计划继续。",
        tone: "warning"
      };
    default:
      return policy === "adaptive" ? {
        eyebrow: "阶段 5 / ADAPTIVE REVISIT",
        title: "链路恢复，系统获取关键增量证据",
        why: `当前 Belief 为 ${beliefPercent}%，需要一次针对剩余不确定性的重访。`,
        response: "复用已保留的稀缺特征，与重访证据融合后只下传最小充分证据包。",
        impact: "任务正在从“更多数据”转向“更有价值的下一次观测”。",
        tone: "evidence"
      } : {
        eyebrow: "阶段 5 / FIXED FOLLOW-UP",
        title: "链路恢复，预排计划继续执行",
        why: "Fixed Policy 按既定顺序获取并处理第二份观测。",
        response: "完成后续观测、处理与全量下传步骤。",
        impact: "任务可以形成结论，但没有消除早先的约束违规。",
        tone: "evidence"
      };
  }
}
