import { describe, expect, it } from "vitest";
import { assetStateModel } from "./assetState";

describe("assetStateModel", () => {
  it("connects trace resources to platform awareness and labels POC telemetry", () => {
    const model = assetStateModel([
      { name: "storage", normalized_value: 0.84 },
      { name: "compute", normalized_value: 0.5 },
      { name: "contact", normalized_value: 0 }
    ], 20, 40, false, "retain");
    expect(model.health).toBe("CONSTRAINED");
    expect(model.impact).toContain("链路中断");
    expect(model.metrics.find((metric) => metric.id === "storage")?.provenance).toBe("TRACE");
    expect(model.metrics.find((metric) => metric.id === "propellant")?.provenance).toBe("POC");
  });
});
