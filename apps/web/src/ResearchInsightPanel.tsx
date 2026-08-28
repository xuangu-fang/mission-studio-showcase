type JsonObject = Record<string, unknown>;

const POLICY_LABELS: Record<string, string> = {
  fixed: "固定流程",
  max_entropy_eig: "信息增益",
  myopic_voi: "单步价值",
  dp_oracle: "DP 参考最优"
};

const HYPOTHESIS_LABELS: Record<string, string> = {
  real_event: "真实事件",
  atmospheric_or_seasonal_confounder: "大气 / 季节混淆",
  sensor_fault: "传感器故障",
  modeled_unknown_ood_surrogate: "未知 / OOD 代理"
};

function object(value: unknown): JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonObject : {};
}

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function percent(value: unknown): string {
  const number = finite(value);
  return number === undefined ? "—" : `${Math.round(number * 100)}%`;
}

function decimal(value: unknown, digits = 2): string {
  const number = finite(value);
  return number === undefined ? "—" : number.toFixed(digits);
}

export interface ResearchPolicySummary {
  id: string;
  label: string;
  totalCost: string;
  totalCostCi: string;
  falseCompletion: string;
  abstention: string;
  regret: string;
  degenerate: boolean;
}

export interface ResearchInsight {
  model: string;
  policies: ResearchPolicySummary[];
  hypotheses: Array<{ label: string; prior: string }>;
  calibration: { policy: string; brier: string; nll: string; ece: string };
  sampleCount: number;
  claimLimit: string;
  digest: string;
}

export function researchInsightModel(result: JsonObject): ResearchInsight {
  if (result.schema_version !== "mission-belief-to-evidence.research-result/1.0.0") {
    throw new Error("Research Result 不是受支持的 Belief-to-Evidence 1.0.0 契约");
  }
  const metrics = object(result.metrics);
  const policyIds = Array.isArray(result.policies) ? result.policies.filter((item): item is string => typeof item === "string") : [];
  if (!policyIds.length) throw new Error("Research Result 缺少 policy 列表");
  const focusPolicy = policyIds.includes("myopic_voi") ? "myopic_voi" : policyIds.find((id) => id !== "fixed") ?? policyIds[0] ?? "fixed";
  const visiblePolicies = ["fixed", focusPolicy, "dp_oracle"].filter((id, index, values) => policyIds.includes(id) && values.indexOf(id) === index);
  const focusMetrics = object(metrics[focusPolicy]);
  const focusCalibration = object(focusMetrics.calibration);
  const uncertainty = object(result.uncertainty);
  const provenance = object(result.provenance);
  const digests = object(result.digests);
  const configuration = object(result.configuration);
  const prior = object(configuration.prior);
  const seeds = Array.isArray(result.seeds) ? result.seeds : [];
  if (!seeds.length || !Array.isArray(uncertainty.hypotheses) || !uncertainty.hypotheses.length) throw new Error("Research Result 缺少 seeds 或竞争假设");
  if (typeof provenance.producer !== "string" || typeof provenance.model_version !== "string") throw new Error("Research Result 缺少 model provenance");
  if (typeof digests.trace_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(digests.trace_sha256)) throw new Error("Research Result 缺少合法 trace digest");

  return {
    model: `${String(provenance.producer ?? "mission-belief-to-evidence")} · ${String(provenance.model_version ?? "1.0")}`,
    policies: visiblePolicies.map((id) => {
      const metric = object(metrics[id]);
      const costCi = object(metric.expected_total_cost_ci95);
      if (finite(metric.expected_total_cost) === undefined || finite(metric.false_completion_rate) === undefined || finite(metric.abstention_rate) === undefined) {
        throw new Error(`Research Result policy ${id} 缺少核心 metrics`);
      }
      return {
        id,
        label: POLICY_LABELS[id] ?? id,
        totalCost: decimal(metric.expected_total_cost),
        totalCostCi: finite(costCi.lower) === undefined || finite(costCi.upper) === undefined ? "CI —" : `[${decimal(costCi.lower)}–${decimal(costCi.upper)}]`,
        falseCompletion: percent(metric.false_completion_rate),
        abstention: percent(metric.abstention_rate),
        regret: id === "dp_oracle" ? "参考线" : decimal(metric.paired_regret_vs_dp_oracle),
        degenerate: (finite(metric.abstention_rate) ?? 0) >= 0.95
      };
    }),
    hypotheses: Array.isArray(uncertainty.hypotheses)
      ? uncertainty.hypotheses.filter((item): item is string => typeof item === "string").map((id) => ({ label: HYPOTHESIS_LABELS[id] ?? id, prior: percent(prior[id]) }))
      : [],
    calibration: {
      policy: POLICY_LABELS[focusPolicy] ?? focusPolicy,
      brier: decimal(focusCalibration.multiclass_brier, 3),
      nll: decimal(focusCalibration.multiclass_nll, 3),
      ece: decimal(focusCalibration.event_ece, 3)
    },
    sampleCount: seeds.length,
    claimLimit: String(uncertainty.claim_limit ?? "该结果仅描述当前受控研究模型中的不确定性。"),
    digest: String(digests.trace_sha256 ?? "").slice(0, 12)
  };
}

export function ResearchInsightPanel({ result }: { result: JsonObject }) {
  let insight: ResearchInsight;
  try {
    insight = researchInsightModel(result);
  } catch (reason) {
    return <aside className="research-insight panel invalid" role="status"><span>科研结果未展示</span><p>{reason instanceof Error ? reason.message : "未知契约"}</p></aside>;
  }

  return (
    <section className="research-insight panel" aria-label="科研模型不确定性与策略对比">
      <header>
        <div><span className="eyebrow">科研不确定性 / UNCERTAINTY LENS</span><h2>不是一个置信度数字，而是多种竞争解释下的取证决策</h2></div>
        <div className="research-model-id"><i />已验证结果 · {insight.model}</div>
      </header>
      <div className="research-hypotheses">
        <span>竞争解释</span>
        {insight.hypotheses.map((hypothesis, index) => <b key={hypothesis.label}><i>{String(index + 1).padStart(2, "0")}</i><em>{hypothesis.label}</em><strong>{hypothesis.prior}</strong></b>)}
      </div>
      <div className="research-policy-grid">
        {insight.policies.map((policy) => (
          <article className={`${policy.id === "myopic_voi" ? "candidate" : policy.id === "dp_oracle" ? "oracle" : ""} ${policy.degenerate ? "degenerate" : ""}`} key={policy.id}>
            <header><span>{policy.label}</span><small>{policy.degenerate ? "退化：几乎总是弃权" : policy.id}</small></header>
            <dl>
              <div><dt>总任务损失 · 95% CI</dt><dd>{policy.totalCost}<small>{policy.totalCostCi}</small></dd></div>
              <div><dt>错误完成</dt><dd>{policy.falseCompletion}</dd></div>
              <div><dt>主动弃权</dt><dd>{policy.abstention}</dd></div>
              <div><dt>对 Oracle 后悔值</dt><dd>{policy.regret}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <aside className="research-calibration">
        <div><span>校准诊断 · {insight.calibration.policy}</span><b>Brier {insight.calibration.brier}</b><b>NLL {insight.calibration.nll}</b><b>ECE {insight.calibration.ece}</b></div>
        <p><strong>边界：</strong>{insight.claimLimit}</p>
        <small>{insight.sampleCount} paired seeds · trace sha256 {insight.digest || "—"}… · SYNTHETIC</small>
      </aside>
    </section>
  );
}
