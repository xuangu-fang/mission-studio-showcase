export type ScenarioId = "adaptive-hsi" | "wildfire-response" | "maritime-sar";

export interface ScenarioConfig {
  id: ScenarioId;
  fixturePath: string;
  shortTitle: string;
  title: string;
  strapline: string;
  evidenceLabel: string;
  hypothesisLabel: string;
  assetLabel: string;
  stationLabel: string;
  aoiLabel: string;
  accent: string;
  accentRgb: string;
  sceneKind: "spectral" | "wildfire" | "search";
}

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: "adaptive-hsi",
    fixturePath: "fixtures/adaptive-hsi/v0.1.0/",
    shortTitle: "高光谱证据",
    title: "自适应高光谱智能",
    strapline: "在链路中断与证据不完整时，选择最有价值的下一次观测。",
    evidenceLabel: "稀有矿物光谱特征证据",
    hypothesisLabel: "稀有矿物光谱假设",
    assetLabel: "MS-01",
    stationLabel: "地面站 / GS-01",
    aoiLabel: "高光谱 AOI",
    accent: "#58e8d6",
    accentRgb: "88, 232, 214",
    sceneKind: "spectral"
  },
  {
    id: "wildfire-response",
    fixturePath: "fixtures/wildfire-response/v0.1.0/",
    shortTitle: "野火响应",
    title: "Wildfire Rapid Response",
    strapline: "在烟云遮挡和通信窗口变化时，协调跨传感器确认火线扩张。",
    evidenceLabel: "火线扩张与热异常证据",
    hypothesisLabel: "火势越过控制线假设",
    assetLabel: "FIREWATCH-01",
    stationLabel: "应急中心 / EOC-01",
    aoiLabel: "火场响应区",
    accent: "#ff9d57",
    accentRgb: "255, 157, 87",
    sceneKind: "wildfire"
  },
  {
    id: "maritime-sar",
    fixturePath: "fixtures/maritime-sar/v0.1.0/",
    shortTitle: "海上搜救",
    title: "Maritime Search & Rescue",
    strapline: "在燃料、误报与通信约束下，动态收缩搜索区域并协调救援资产。",
    evidenceLabel: "遇险信标与视觉确认融合证据",
    hypothesisLabel: "目标位于优先搜索区假设",
    assetLabel: "SEARCH-01",
    stationLabel: "救援协调中心 / RCC-01",
    aoiLabel: "海上搜索区",
    accent: "#6eb8f2",
    accentRgb: "110, 184, 242",
    sceneKind: "search"
  }
];

export function scenarioConfig(id: ScenarioId): ScenarioConfig {
  return SCENARIOS.find((scenario) => scenario.id === id) ?? SCENARIOS[0]!;
}
