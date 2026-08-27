import { describe, expect, it } from "vitest";
import { missionOrbitPosition, storyCameraHeight } from "./worldMotion";

describe("mission world motion", () => {
  const aoi = [-117.3, 34.0, -116.7, 34.5];

  it("moves deterministically across the orbit as mission time advances", () => {
    const firstPass = missionOrbitPosition(aoi, 5, 60);
    const outbound = missionOrbitPosition(aoi, 13, 60);
    const nextPass = missionOrbitPosition(aoi, 21, 60);
    expect(outbound.longitude).toBeGreaterThan(firstPass.longitude);
    expect(nextPass.longitude).toBeCloseTo(firstPass.longitude);
    expect(missionOrbitPosition(aoi, 13, 60)).toEqual(outbound);
  });

  it("moves the Story camera closer for evidence events", () => {
    expect(storyCameraHeight("evidence.produced")).toBeLessThan(storyCameraHeight("mission.started"));
    expect(storyCameraHeight("constraint.activated")).toBeGreaterThan(storyCameraHeight("belief.updated"));
  });
});
