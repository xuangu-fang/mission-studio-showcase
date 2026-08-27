# 多场景演示说明（Multi-case Demo）

## 为什么需要多个 case

Mission Studio 的技术主张不能只依赖一个高光谱故事。三个场景共同检验同一条 evidence-to-action loop 是否能跨任务复用，同时保留可解释的约束、权限和结果差异。

| Case | 核心不确定性 | Adaptive action | 对外可解释结果 |
| --- | --- | --- | --- |
| Adaptive HSI | 首次光谱证据低于 gate | `retain` + `revisit` | 更高 utility/MB，零硬约束违规 |
| Wildfire Response | 烟云使单源观测不足 | `request_cross_sensor` + 紧凑下传 | Fixed 未完成；Adaptive 在 36s 形成结论 |
| Maritime SAR | 弱信标、误报与有限搜索资源 | 保留强线索 + 针对性 `revisit` | Fixed 未完成；Adaptive 在 33s 形成结论 |

## 可视化规则

- 三个 case 都通过同一 Public Contract validator 加载；
- Story Mode 的五个阶段从 trace event 时间派生，不维护第二套演示时钟；
- 高光谱场景突出 orbit、AOI、footprint 与 downlink；
- 野火场景增加火线 perimeter 与 hotspot；
- 海上搜救场景增加搜索航线与候选目标；
- Fixed/Adaptive 切换保持同一场景的 initial-condition digest 和任务时间尺度。

## 数据成熟度

当前三个场景均为 project-authored synthetic scenario。数值用于测试 contracts、策略分歧与因果可视化，不代表 calibrated platform performance、真实应急响应能力或 operational autonomy。

## 自然语言 Authoring

Showcase 可以选择性连接仅绑定 localhost 的 private Core：

```text
自然语言 intent
  → DeepSeek structured proposal
  → MissionIR JSON Schema
  → semantic validation
  → proposal_only（未授权）
```

API key 只存在于 private Core process。公共静态页面保持完全离线可用，也不会获得任意任务执行能力。
