export interface OrbitPosition {
  longitude: number;
  latitude: number;
  altitudeM: number;
}

export function missionOrbitPosition(aoi: number[], simTime: number, maxTime: number): OrbitPosition {
  if (aoi.length !== 4) return { longitude: 0, latitude: 0, altitudeM: 520_000 };
  const [west, south, east, north] = aoi;
  const centerLongitude = (west + east) / 2;
  const centerLatitude = (south + north) / 2;
  const clampedTime = Math.max(0, Math.min(Math.max(1, maxTime), simTime));
  const phase = ((clampedTime - 5) * Math.PI) / 16;
  return {
    longitude: centerLongitude + Math.sin(phase) * 9,
    latitude: centerLatitude + Math.sin(phase * 2) * 4,
    altitudeM: 520_000
  };
}

export function storyCameraHeight(eventType: string): number {
  const heights: Record<string, number> = {
    "mission.started": 4_200_000,
    "plan.validated": 3_600_000,
    "observation.acquired": 1_350_000,
    "evidence.produced": 1_050_000,
    "belief.updated": 1_150_000,
    "constraint.activated": 2_150_000,
    "constraint.cleared": 1_850_000,
    "outcome.updated": 3_000_000
  };
  return heights[eventType] ?? 1_650_000;
}
