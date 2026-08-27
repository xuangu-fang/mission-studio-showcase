# 体验规范（Experience Specification）

## 体验目标

首次访问者应在 90 秒内理解 Mission Studio 是一个 evidence-to-action workbench，而不只是轨道查看器。专家应在五分钟内能够暂停、检查 provenance、比较 policy，并找出改变某项 action 的 constraint。

## 两种模式，同一份事实

### Story Mode

- 引导式焦点与镜头编排；
- 与特定 trace event 绑定的简短说明文字；
- 自动推进，但可立即暂停或退出；
- 不使用预渲染视频，也不使用单独的 story data。

### Operator Mode

- timeline seek 和 event list；
- action graph 与 constraint 检查；
- evidence/observation provenance；
- resource margin；
- fixed/adaptive 和 fork comparison；
- casefile summary。

## 桌面端 information architecture

```text
┌ Mission intent / SLA ─────────────────────── Run / Compare / Export ┐
├──────────────┬───────────────────────────────────┬───────────────────┤
│ Mission      │                                   │ Belief / Evidence │
│ objectives   │       3D world + AOI + assets     │ hypothesis        │
│ constraints  │       orbit / footprints / links  │ next action + why │
│ action graph │                                   │ authority / risk  │
├──────────────┴───────────────────────────────────┴───────────────────┤
│ Evidence timeline | power | thermal | compute | storage | contact   │
├──────────────────────────────────────────────────────────────────────┤
│ Fixed policy outcome       ↔        Adaptive policy outcome         │
└──────────────────────────────────────────────────────────────────────┘
```

面板可以折叠或按上下文出现；不要让每个区域始终充满密集 telemetry。

## 必需交互

- 播放、暂停、变速、单步、seek；
- 在地球或 timeline 上选择 event，并高亮其 causal chain；
- 在 observation、evidence、belief update、decision 和 outcome 之间移动；
- 切换 fixed/adaptive run 时，不改变时间或视觉比例；
- 检查所选 decision 时刻的 resource margin；
- 在当前时刻进入/退出 Story Mode；
- 重置到已知的 deterministic state；
- 支持键盘访问的 focus 和 event inspection。

## 领域视觉语义

- 蓝色/青色：plan 和 available capability；
- 琥珀色：uncertainty、等待 evidence，或接近限制时的压力；
- 红色：仅用于 hard constraint violation 或 fault；
- 绿色：由 evidence 支持且已通过 gate 的状态；
- 虚线/透明：forecast、counterfactual 或较低 confidence；
- 亮度和动态效果不能单独承载关键信息。

## 质量标准

- 视觉上有辨识度，但不堆砌科幻装饰；
- 在普通笔记本屏幕上可读；
- 所有视图中的 playback 与 seek 稳定；
- 提供无障碍的 reduced-motion mode；
- loading、unsupported-version 和 asset-unavailable 状态必须有实际意义；
- screenshot baseline 必须在同一套固定版本的 Linux 环境中生成和比较；
- 不向浏览器下载完整 hyperspectral cube。

## Spectral interaction

选择地图区域或 observation 时，可以展示一个由服务器预先生成或 fixture 提供的小型 spectral profile 和 evidence marker。目标是把空间 pixel 与 evidence decision 连接起来，而不是复刻完整的 hyperspectral analysis desktop。
