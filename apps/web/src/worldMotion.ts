export interface OrbitPosition {
  longitude: number;
  latitude: number;
  altitudeM: number;
  physicalTimeS: number;
}

export interface OrbitProfile {
  altitudeM: number;
  periodS: number;
  inclinationDeg: number;
  speedKmS: number;
  timeCompression: number;
  repeatCycleS: number;
}

type Vector3 = readonly [number, number, number];

const EARTH_RADIUS_M = 6_378_137;
const EARTH_GRAVITATIONAL_PARAMETER = 3.986004418e14;
const SIDEREAL_DAY_S = 86_164.0905;
const EARTH_ROTATION_RAD_S = (Math.PI * 2) / SIDEREAL_DAY_S;
const ORBIT_ALTITUDE_M = 554_250;
const ORBIT_RADIUS_M = EARTH_RADIUS_M + ORBIT_ALTITUDE_M;
// A 15-revolution sidereal repeat cycle gives a plausible LEO period and keeps
// every checked fixture deterministic without a network TLE dependency.
const ORBIT_PERIOD_S = SIDEREAL_DAY_S / 15;
const ORBIT_ANGULAR_RATE = (Math.PI * 2) / ORBIT_PERIOD_S;
const PASS_FRACTION = 0.1;
const REVISIT_PASS_FRACTION = 0.76;
const PASS_CONTEXT_S = 600;
const ORBIT_INCLINATION_DEG = 97.4;

function radians(degrees: number) {
  return degrees * Math.PI / 180;
}

function degrees(value: number) {
  return value * 180 / Math.PI;
}

function add(a: Vector3, b: Vector3, aScale = 1, bScale = 1): Vector3 {
  return [a[0] * aScale + b[0] * bScale, a[1] * aScale + b[1] * bScale, a[2] * aScale + b[2] * bScale];
}

function rotateEarth(vector: Vector3, physicalTimeS: number): Vector3 {
  const rotation = EARTH_ROTATION_RAD_S * physicalTimeS;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return [
    cosine * vector[0] + sine * vector[1],
    -sine * vector[0] + cosine * vector[1],
    vector[2]
  ];
}

function orbitBasis(aoi: number[]) {
  if (aoi.length !== 4) {
    return { radial: [1, 0, 0] as Vector3, tangent: [0, 1, 0] as Vector3 };
  }
  const [west, south, east, north] = aoi;
  const longitude = radians((west + east) / 2);
  const latitude = radians((south + north) / 2);
  const radial: Vector3 = [
    Math.cos(latitude) * Math.cos(longitude),
    Math.cos(latitude) * Math.sin(longitude),
    Math.sin(latitude)
  ];
  const eastVector: Vector3 = [-Math.sin(longitude), Math.cos(longitude), 0];
  const northVector: Vector3 = [
    -Math.sin(latitude) * Math.cos(longitude),
    -Math.sin(latitude) * Math.sin(longitude),
    Math.cos(latitude)
  ];
  const targetNormalZ = Math.cos(radians(ORBIT_INCLINATION_DEG));
  const heading = Math.asin(Math.max(-1, Math.min(1, targetNormalZ / Math.max(0.01, Math.cos(latitude)))));
  return { radial, tangent: add(northVector, eastVector, Math.cos(heading), Math.sin(heading)) };
}

export function missionPhysicalTime(simTime: number, maxTime: number) {
  const duration = Math.max(1, maxTime);
  const clamped = Math.max(0, Math.min(duration, simTime));
  const fraction = clamped / duration;
  if (fraction <= PASS_FRACTION) {
    return ((fraction - PASS_FRACTION) / PASS_FRACTION) * PASS_CONTEXT_S;
  }
  if (fraction <= REVISIT_PASS_FRACTION) {
    return ((fraction - PASS_FRACTION) / (REVISIT_PASS_FRACTION - PASS_FRACTION)) * SIDEREAL_DAY_S;
  }
  return SIDEREAL_DAY_S + ((fraction - REVISIT_PASS_FRACTION) / (1 - REVISIT_PASS_FRACTION)) * PASS_CONTEXT_S;
}

export function orbitPositionAtPhysicalTime(aoi: number[], physicalTimeS: number, altitudeM = ORBIT_ALTITUDE_M): OrbitPosition {
  const { radial, tangent } = orbitBasis(aoi);
  const phase = physicalTimeS * ORBIT_ANGULAR_RATE;
  const inertial = add(radial, tangent, Math.cos(phase), Math.sin(phase));
  const earthFixed = rotateEarth(inertial, physicalTimeS);
  const longitude = degrees(Math.atan2(earthFixed[1], earthFixed[0]));
  const latitude = degrees(Math.asin(Math.max(-1, Math.min(1, earthFixed[2]))));
  return { longitude, latitude, altitudeM, physicalTimeS };
}

export function missionOrbitPosition(aoi: number[], simTime: number, maxTime: number): OrbitPosition {
  return orbitPositionAtPhysicalTime(aoi, missionPhysicalTime(simTime, maxTime));
}

export function missionOrbitTrack(aoi: number[], samples = 241): OrbitPosition[] {
  const count = Math.max(24, Math.floor(samples));
  return Array.from({ length: count }, (_, index) => {
    const fraction = index / (count - 1);
    return orbitPositionAtPhysicalTime(aoi, (fraction - PASS_FRACTION) * ORBIT_PERIOD_S);
  });
}

export function missionOrbitProfile(maxTime: number): OrbitProfile {
  return {
    altitudeM: ORBIT_ALTITUDE_M,
    periodS: ORBIT_PERIOD_S,
    inclinationDeg: ORBIT_INCLINATION_DEG,
    speedKmS: Math.sqrt(EARTH_GRAVITATIONAL_PARAMETER / ORBIT_RADIUS_M) / 1000,
    timeCompression: SIDEREAL_DAY_S / Math.max(1, maxTime),
    repeatCycleS: SIDEREAL_DAY_S
  };
}

export function storyCameraRange(eventType: string): number {
  if (eventType === "constraint.activated") return 10_800_000;
  if (eventType === "observation.acquired" || eventType === "evidence.produced") return 8_600_000;
  if (eventType === "outcome.updated") return 11_600_000;
  return 9_800_000;
}

// Kept for the public test/API surface; Story now uses a wide range instead of
// an AOI fly-to height.
export function storyCameraHeight(eventType: string): number {
  return storyCameraRange(eventType);
}
