# Public Fixtures

这里只保存体积小、经过审查、schema-valid 且具有 attribution 的公开 fixture。每个 fixture 必须提供 manifest，说明 contract/scenario/policy version、来源、许可信息、value-status label，并在适用时提供 checksum。

绝不能整体复制 private trace。Public fixture 必须由显式 allowlist export 生成，或直接来自可公开的 public/synthetic material。

当前 checked fixture：

- `adaptive-hsi/v0.1.0`：稀缺光谱证据、链路中断与 adaptive revisit；
- `wildfire-response/v0.1.0`：烟云不确定性、跨传感器确认与紧凑下传；
- `maritime-sar/v0.1.0`：误报、搜索资源约束与目标区域收敛。

三组场景都包含共享初始条件的 fixed/adaptive run pair，并通过相同 Public Contract `0.1.0` 验证。
