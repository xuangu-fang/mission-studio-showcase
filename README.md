# Mission Studio Showcase

Mission Studio Showcase 是 Mission Intelligence 系统面向公众的浏览器窗口。它展示任务意图如何形成已验证计划、观测如何成为证据、信念如何在不确定性下更新，以及资源受限系统为何选择行动、重访、下传、升级或弃权。

仓库目前已进入 **Showcase Gate A 的多场景可运行纵切**：浏览器可以完全离线地验证并回放三组 fixed/adaptive public trace，所有任务视图都由各自同一条有序事件流驱动。

配套的私有 `mission-studio` 仓库负责 Mission Compiler、Agent Gateway、validator、planner、deterministic engine、高保真 adapter、私有 casefile 与内部部署。本公开仓库不导入任何私有源代码，只消费经过清理、带版本的 public contract 与 fixture。

## 第一个 demo 要证明什么

有价值的 Mission Intelligence demo 不是一个旋转的三维地球。访问者应该能够看到并检查下面这条闭环：

```text
任务意图 Mission Intent
  → 行动图 Action Graph
  → 观测 Observation
  → 证据 Evidence
  → 信念更新 Belief Update
  → 资源感知决策
  → 任务结果与反事实对比
```

当前任务展厅包含三组项目自有 synthetic 场景，每组都在相同初始条件下比较 fixed 与 adaptive policy：

- 自适应高光谱智能：在证据不完整与链路中断时保留稀缺证据并安排重访；
- Wildfire Rapid Response：在烟云与通信窗口变化时请求跨传感器确认；
- Maritime Search & Rescue：在燃料、误报与通信约束下收缩搜索区域。

## 当前公开体验

- Cesium 世界视图：AOI、任务资产、任务事件与本地离线椭球；
- 任务意图、目标、约束和 Action Graph；
- Evidence、Belief、不确定性和“下一行动 / 原因”；
- 资源状态与统一任务时间线；
- 播放、暂停、步进、seek、事件检查与策略切换；
- 面向讲解的 Story Mode 和面向检查的 Operator Mode；
- fixed/adaptive outcome 对比；
- 三场景任务展厅与场景专属空间编码；
- 可选的本地私有 Core 连接，用自然语言调用 DeepSeek 生成未授权的 MissionIR proposal；
- 默认仍使用静态离线 fixture，公共页面不需要后端或 API key。

## 本地运行

要求 Node `22.23.2` 与 pnpm `11.24.0`。

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

打开 `http://localhost:5173/mission-studio-showcase/`。

运行全部检查与 Pages 子路径构建：

```bash
corepack pnpm check
```

## 当前纵切包含

- public contract `0.1.0` 的严格 JSON Schema 验证；
- deterministic fixed/adaptive trace replay；
- adaptive HSI、wildfire response 与 maritime SAR 三组 checked fixture；
- 共享时钟上的 play、pause、step、seek、reset 与 policy switch；
- 不依赖远程地图服务的 Cesium AOI 视图；
- mission graph、evidence/belief、constraint、resource、causal chain 和 outcome projections；
- Story / Operator 两种模式；
- 自然语言 Mission Authoring 对话框及清晰的 proposal-only authorization boundary；
- unit/fixture tests 和 GitHub Pages subpath build。

## 仓库结构

```text
apps/web/                 React/Vite 浏览器应用
packages/contracts/       public schema、类型与验证器
packages/domain/          事件排序、投影、因果链与回放语义
public/fixtures/          小型、经过审查的 public trace
public/assets/            可再分发的轻量视觉资产
docs/                     架构、UX、计划、contract 与场景说明
tests/                    后续 interaction、a11y 与 visual tests
AGENTS.md                 coding agent 必读的边界与交接上下文
project.yaml              项目状态、Hub 关联和 contract 支持版本
```

## 推荐阅读顺序

1. [公开架构](docs/architecture/PUBLIC_ARCHITECTURE.md)
2. [Public Trace Contract](docs/contracts/PUBLIC_TRACE_CONTRACT.md)
3. [体验规范](docs/ux/EXPERIENCE_SPEC.md)
4. [实现路线图](docs/planning/IMPLEMENTATION_ROADMAP.md)
5. [开发与部署](docs/development/ENVIRONMENT_AND_DEPLOYMENT.md)
6. [首个场景](docs/scenarios/ADAPTIVE_HSI.md)
7. [多场景演示说明](docs/scenarios/MULTI_CASE_DEMO.md)

## 当前状态

`Implementing / Showcase Gate A+B / multi-case runnable demo`

静态 Story/Operator demo 不需要后端、模型 provider 或私有仓库即可运行。自然语言 Authoring 是仅在本地连接私有 Core 后启用的可选能力；DeepSeek key 永远不进入本仓库或浏览器 bundle。

## License

License 仍需项目 owner 明确决定。在 license 加入前，公开可见不代表允许复制、修改或再分发；外部代码贡献也应等待该决策。
