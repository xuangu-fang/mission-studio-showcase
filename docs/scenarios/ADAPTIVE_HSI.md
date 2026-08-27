# Public Scenario — Mission-Adaptive Hyperspectral Intelligence

## 对外叙事

mission author 要求系统在一个 area of interest（AOI）上收集足够的 evidence，以改变某项科学或运行结论，同时遵守 deadline 和 downlink budget。

访问者会看到两个初始条件相同的 run：

- fixed policy 继续执行原定的 acquisition/downlink 序列；
- adaptive policy 响应稀有或不完整的 spectral evidence、resource pressure 和 link availability。

## 必需的叙事节点

1. 展示 mission intent 和 success gate。
2. 编译并验证 action graph。
3. AOI 上空传入一项 public HSI observation。
4. 选择 footprint，将空间位置与 spectral/evidence summary 连接起来。
5. Belief 发生变化，但可能仍低于其 confidence gate。
6. Adaptive policy 选择 retain、revisit、request evidence、downlink 或 abstain，并展示清晰理由。
7. 一项 storage 或 link event 迫使系统做出 tradeoff。
8. Fixed 和 adaptive outcome 以可度量方式收敛或分歧。

## 必需的 comparison metric

- mission completion；
- time-to-knowledge；
- utility per transmitted bit；
- hard-constraint violation；
- evidence/provenance completeness；
- retained rare evidence；
- abstention behavior。

## Public data policy

EMIT 和 EnMAP 是候选数据源。所选 fixture 必须包含 source URL、product identifier、license/terms review、derivation step、attribution、checksum，并明确标记 synthetic scenario overlay。

不得使用任何 partner data、internal mission target 或 private hardware profile 作为 placeholder。

## 可视化边界

目标不是构建一个完整的 hyperspectral analysis tool。只展示理解 evidence 与 action decision 所必需的 spatial-spectral 关系。繁重的 cube processing 保留在浏览器之外。
