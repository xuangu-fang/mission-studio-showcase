import { describe, expect, it } from "vitest";
import { missionOrbitPosition, missionOrbitProfile, missionOrbitTrack, storyCameraRange } from "./worldMotion";

describe("mission world motion", () => {
  const aoi = [-117.3, 34.0, -116.7, 34.5];

  it("crosses the AOI at the deterministic primary-pass epoch", () => {
    const pass = missionOrbitPosition(aoi, 6, 60);
    expect(pass.longitude).toBeCloseTo(-117, 8);
    expect(pass.latitude).toBeCloseTo(34.25, 8);
    expect(pass.altitudeM).toBe(554_250);
    expect(pass.physicalTimeS).toBeCloseTo(0, 8);
    expect(missionOrbitPosition(aoi, 6, 60)).toEqual(pass);
  });

  it("exposes a plausible, reproducible LEO profile and global track", () => {
    const profile = missionOrbitProfile(60);
    expect(profile.periodS).toBeCloseTo(5744.2727, 4);
    expect(profile.inclinationDeg).toBe(97.4);
    expect(profile.speedKmS).toBeGreaterThan(7.5);
    expect(profile.speedKmS).toBeLessThan(7.7);
    expect(profile.timeCompression).toBeCloseTo(1436.068175, 5);
    expect(profile.repeatCycleS).toBeCloseTo(86_164.0905, 4);
    const track = missionOrbitTrack(aoi);
    expect(track).toHaveLength(241);
    expect(track.every((position) => Number.isFinite(position.longitude) && Number.isFinite(position.latitude))).toBe(true);
    expect(Math.max(...track.map((position) => position.latitude))).toBeGreaterThan(80);
    expect(Math.min(...track.map((position) => position.latitude))).toBeLessThan(-80);
  });

  it("returns to the same AOI on the checked next-day revisit", () => {
    const revisit = missionOrbitPosition(aoi, 45.6, 60);
    expect(revisit.longitude).toBeCloseTo(-117, 7);
    expect(revisit.latitude).toBeCloseTo(34.25, 7);
    expect(revisit.physicalTimeS).toBeCloseTo(86_164.0905, 4);
  });

  it("keeps the Story camera wide while giving evidence a closer framing", () => {
    expect(storyCameraRange("evidence.produced")).toBeLessThan(storyCameraRange("mission.started"));
    expect(storyCameraRange("constraint.activated")).toBeGreaterThan(storyCameraRange("belief.updated"));
  });
});
