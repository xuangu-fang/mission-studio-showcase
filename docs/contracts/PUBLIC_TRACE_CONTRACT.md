# Public Trace Contract

`packages/contracts/schemas/0.1.0/` 是当前 Public Manifest、Runtime Event 与 Outcome 的准确 JSON Schema。本文件说明这些 schema 之外的发布、导入和兼容语义。

## Portable Research Run

Showcase 可以导入独立研究仓库产生的清理后 `.missionrun` JSON envelope。顶层契约为 `mission-run-bundle/0.1.0`，至少包含：

- `export_metadata.classification = public`；
- 稳定的 `export_id`、创建时间和 producer 版本；
- 一个现有 Public Manifest；
- 以 `run_id` 分组的 Runtime Event arrays；
- 以 `run_id` 分组的 Public Outcomes；
- 可选、版本化的 `research_result`。

导入器必须继续调用与内置 fixture 相同的 manifest/event/outcome validator，检查 event ordering、seq、causation 与 schema version。它不得把研究仓库的内部 Trace 当成 Mission Studio Runtime Event，也不得接受 `internal` 或未声明 classification 的产物。

`export_metadata.integrity` 存在时，当前浏览器导入器验证其算法与 digest 格式；producer CI 和发布流程负责重算内容 digest。UI 的“契约验证通过”不表示数字签名、发布者身份或浏览器内 cryptographic verification。

`research_result` 是一个附属研究 artifact。它可以提供 rival-hypothesis distribution、policy benchmark、calibration、OOD 边界和 provenance；它不拥有 Runtime Truth，不授权行动，也不替代 Core 的 Belief / Policy / Authorization Gate。

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
