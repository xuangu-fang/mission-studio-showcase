import { describe, expect, it } from "vitest";
import { researchInsightModel } from "./ResearchInsightPanel";

const policyMetric = (cost: number, regret: number) => ({
  expected_total_cost: cost,
  false_completion_rate: 0.1,
  abstention_rate: 0.2,
  paired_regret_vs_dp_oracle: regret,
  calibration: { multiclass_brier: 0.25, multiclass_nll: 0.4, event_ece: 0.05 }
});

describe("research uncertainty lens", () => {
  it("projects a versioned backend result into a compact Chinese-first comparison", () => {
    const insight = researchInsightModel({
      schema_version: "mission-belief-to-evidence.research-result/1.0.0",
      policies: ["fixed", "myopic_voi", "dp_oracle"],
      seeds: [1, 2, 3],
      metrics: {
        fixed: { ...policyMetric(4.2, 1.2), expected_total_cost_ci95: { lower: 3.8, upper: 4.6 } },
        myopic_voi: { ...policyMetric(3.3, 0.3), expected_total_cost_ci95: { lower: 3, upper: 3.6 } },
        dp_oracle: { ...policyMetric(3, 0), expected_total_cost_ci95: { lower: 2.7, upper: 3.3 } }
      },
      configuration: { prior: { real_event: 0.4, sensor_fault: 0.3, modeled_unknown_ood_surrogate: 0.3 } },
      uncertainty: {
        hypotheses: ["real_event", "sensor_fault", "modeled_unknown_ood_surrogate"],
        claim_limit: "synthetic only"
      },
      provenance: { producer: "mission-belief-to-evidence", model_version: "1.0.0" },
      digests: { trace_sha256: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" }
    });

    expect(insight.policies.map((policy) => policy.label)).toEqual(["固定流程", "单步价值", "DP 参考最优"]);
    expect(insight.policies[1]?.totalCost).toBe("3.30");
    expect(insight.policies[2]?.regret).toBe("参考线");
    expect(insight.policies[1]?.degenerate).toBe(false);
    expect(insight.hypotheses).toContainEqual({ label: "传感器故障", prior: "30%" });
    expect(insight.policies[1]?.totalCostCi).toBe("[3.00–3.60]");
    expect(insight.calibration.policy).toBe("单步价值");
    expect(insight.sampleCount).toBe(3);
    expect(insight.digest).toBe("abcdef123456");
  });

  it("rejects an unversioned result instead of guessing field meaning", () => {
    expect(() => researchInsightModel({ metrics: {} })).toThrow(/Belief-to-Evidence/);
  });
});
