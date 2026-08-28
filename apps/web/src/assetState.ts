export interface AssetMetric {
  id: "link" | "power" | "storage" | "compute" | "propellant";
  label: string;
  shortLabel: string;
  value: number;
  display: string;
  tone: "nominal" | "warning" | "offline";
  provenance: "TRACE" | "POC";
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function traceValue(resources: Array<Record<string, unknown>>, name: string, fallback: number) {
  const resource = resources.find((item) => String(item.name) === name);
  const value = Number(resource?.normalized_value ?? resource?.value);
  return Number.isFinite(value) ? clamp(value > 1 ? value / 100 : value) : fallback;
}

export function assetStateModel(
  resources: Array<Record<string, unknown>>,
  simTime: number,
  maxTime: number,
  contactAvailable: boolean,
  actionType: string
) {
  const progress = clamp(simTime / Math.max(1, maxTime));
  const storage = traceValue(resources, "storage", 0.08);
  const compute = traceValue(resources, "compute", 0.12);
  const power = clamp(0.89 - progress * 0.07 - compute * 0.04);
  const propellant = clamp(0.93 - progress * 0.055);
  const metrics: AssetMetric[] = [
    {
      id: "link", label: "通信链路", shortLabel: "LINK", value: contactAvailable ? 1 : 0,
      display: contactAvailable ? "在线" : "中断", tone: contactAvailable ? "nominal" : "offline", provenance: "TRACE"
    },
    {
      id: "power", label: "电源余量", shortLabel: "PWR", value: power,
      display: `${Math.round(power * 100)}%`, tone: power < 0.25 ? "warning" : "nominal", provenance: "POC"
    },
    {
      id: "storage", label: "存储占用", shortLabel: "MEM", value: storage,
      display: `${Math.round(storage * 100)}%`, tone: storage >= 0.8 ? "warning" : "nominal", provenance: "TRACE"
    },
    {
      id: "compute", label: "计算负载", shortLabel: "CPU", value: compute,
      display: `${Math.round(compute * 100)}%`, tone: compute >= 0.85 ? "warning" : "nominal", provenance: "TRACE"
    },
    {
      id: "propellant", label: "姿控燃料", shortLabel: "PROP", value: propellant,
      display: `${Math.round(propellant * 100)}%`, tone: propellant < 0.25 ? "warning" : "nominal", provenance: "POC"
    }
  ];
  const actionLabels: Record<string, string> = {
    observe: "正在获取新观测",
    revisit: "正在执行目标重访",
    process: "正在在轨处理证据",
    retain: "正在保留高价值证据",
    downlink: "正在下传证据包",
    request_cross_sensor: "正在请求跨传感器协同"
  };
  const impact = !contactAvailable
    ? "链路中断：保持自主运行，证据留存在轨"
    : storage >= 0.8
      ? "存储承压：优先筛选与压缩高价值证据"
      : actionLabels[actionType] ?? "平台持续感知自身状态，等待下一动作";
  return {
    metrics,
    health: metrics.some((metric) => metric.tone !== "nominal") ? "CONSTRAINED" : "NOMINAL",
    impact
  };
}
