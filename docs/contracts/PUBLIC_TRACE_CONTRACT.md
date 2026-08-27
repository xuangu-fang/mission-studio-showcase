# Public Trace Contract

准确的 JSON Schema 将在 Showcase Gate A 与 Core Gate 1 协同期间创建。本文档定义 public contract 的最小语义集合。

## Public manifest

每个 fixture 或 live run 都以一个 manifest 开始，其中包含：

- public contract version；
- scenario、policy 和 producer version；
- run IDs 和 comparison grouping；
- time range 和 clock scale；
- asset 和 attribution 清单；
- value-status 图例：observed、derived、inferred、synthetic、calibrated、counterfactual；
- artifact 发布时的 integrity checksum。

## Public runtime event

必需概念：

- 单调递增的 `seq`；
- 稳定的 event ID；
- simulation/event time；
- event type 和 actor category；
- correlation 和 causation reference；
- 可安全展示的 payload；
- provenance summary；
- 数值的 classification/status label。

初始 event type 应覆盖：

- mission/plan lifecycle；
- observation acquired；
- evidence produced；
- belief updated；
- resource updated；
- action proposed/selected/rejected/started/completed/failed/abstained；
- link/fault/constraint event；
- outcome updated。

## Public summary

- `PublicResourceState`：归一化 resource value、unit、margin、warning/violation state、synthetic/calibrated label。
- `PublicEvidenceSummary`：claim、direction、confidence/score、observation references、method label。
- `PublicBeliefSummary`：hypothesis、confidence/score、unknowns、evidence references、threshold state。
- `PublicDecisionSummary`：candidates、selected/rejected action、constraint/utility summary、abstention reason。
- `PublicCasefileSummary`：outcome metrics、supported versions、provenance completeness、attribution。

## 明确排除的内容

- 原始 model prompt/response；
- public provenance 不需要的 API/provider 细节；
- 私有 artifact path 或 signed URL；
- partner 或 customer identifier；
- proprietary calibration 和 hardware profile；
- internal stack trace、network topology 或 endpoint name；
- 不受限制的高维 data payload。

## 兼容性

Showcase 必须以有帮助的消息拒绝不支持的 major version，为受支持版本保留 fixture，并测试 ordering/gap/duplicate 行为。它绝不能静默地重新解释已重命名或语义已改变的字段。
