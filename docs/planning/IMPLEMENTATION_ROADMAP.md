# 实施路线图（Implementation Roadmap）

## Showcase Gate 0 — 仓库 bootstrap

交付文档、repository boundary、public contract proposal、UX specification、Linux/Pages 方案和 Agent handoff。

退出条件：coding agent 能识别第一个 vertical slice，并解释为什么不需要访问私有仓库。

## Showcase Gate A — Trace-driven 可视化骨架

构建：

- React/TypeScript/Vite 应用；
- public trace schema validation；
- deterministic playback clock 和 projection layer；
- design token 和小型 domain component catalog；
- Cesium world view；
- mission graph、evidence/belief panel、resource ribbon 和 timeline；
- 一对 fixed/adaptive fixture；
- Story Mode 和 Operator Mode；
- GitHub Pages deployment workflow；
- Playwright interaction、accessibility 和 visual regression。

Evidence gate：

- seek 和 reset 后，每个视图都保持同步；
- 所选 decision 能揭示其 causal observation/evidence/resource chain；
- fixed/adaptive comparison 使用相同的时钟和初始条件；
- static build 可在 `/mission-studio-showcase/` 正常运行；
- 不需要后端或私有访问；
- screenshot baseline 在固定版本的 Linux CI 中保持稳定。

如果大部分投入都流向 3D 装饰，而 evidence/action causality 仍然不清晰，则停止或缩减工作。

## Showcase Gate B — Public adaptive HSI 场景

构建：

- 经过审查的 public scene/crop 和 attribution；
- spatial-spectral evidence interaction；
- link interruption 或 storage-pressure branch；
- time-to-knowledge、utility/bit、violation 和 evidence completeness；
- public casefile summary 与可下载的 fixture manifest。

Evidence gate：外部访问者无需阅读源代码，也能正确解释 adaptive 和 fixed policy 为何产生分歧。

## Showcase Gate C — 可选的 live-connected mode

仅在 static demo 足够成熟后构建：

- 通过环境变量配置 API base URL；
- HTTPS/WebSocket event client；
- reconnect/gap/unsupported-version 状态；
- simulation/live 状态标签；
- 仅在 API 要求时使用 authentication；
- static fallback。

Evidence gate：live input 和 static input 产生相同的 projection 语义，且 frontend bundle 中不嵌入任何 credential。

## Showcase Gate D — 社区与 benchmark 界面

- public scenario/trace contribution format；
- 有文档记录的 contract release；
- comparison gallery；
- 指向 paper、benchmark 和 reproducible artifact 的链接；
- 已获批准的 license 和 contribution workflow。

## 建议的第一批 issue

1. 固定准确的 Node/pnpm 版本，并建立 Vite subpath build。
2. 实现最小 public RuntimeEvent schema 和 validator。
3. 构建不含 UI 的 deterministic playback/projection package。
4. 建立 design token 和四个 domain component。
5. 使用 local fallback imagery 策略渲染最小 Cesium fixture。
6. 同步 timeline、mission graph 和 evidence panel。
7. 加入 fixed/adaptive comparison 和 Story Mode choreography。
8. 部署 Pages 并建立 Playwright baseline。
