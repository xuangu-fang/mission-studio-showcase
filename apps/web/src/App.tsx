import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Cartesian2,
  Cartesian3,
  buildModuleUrl,
  Color,
  ColorMaterialProperty,
  ConstantPositionProperty,
  ConstantProperty,
  HeightReference,
  HeadingPitchRange,
  LabelStyle,
  Math as CesiumMath,
  Matrix4,
  NearFarScalar,
  PolylineDashMaterialProperty,
  PolygonHierarchy,
  TileMapServiceImageryProvider,
  Viewer
} from "cesium";
import type { PublicManifest, PublicRuntimeEvent, TraceBundle } from "@mission-studio/contracts";
import { parseJsonLines, validateBundle } from "@mission-studio/contracts";
import { causalChain, projectEvents } from "@mission-studio/domain";
import { missionOrbitPosition, missionOrbitProfile, missionOrbitTrack, storyCameraRange } from "./worldMotion";
import { PayloadView } from "./PayloadView";
import { storyBeat, storyFocusEvent, storyStageIndex, storyStages, type StoryBeat } from "./storyModel";
import { SCENARIOS, scenarioConfig, type ScenarioConfig, type ScenarioId } from "./scenarioCatalog";

type Mode = "operator" | "story";
type PolicyKind = "fixed" | "adaptive";

async function loadBundle(scenario: ScenarioConfig): Promise<TraceBundle> {
  const fixtureBase = `${import.meta.env.BASE_URL}${scenario.fixturePath}`;
  const manifestResponse = await fetch(`${fixtureBase}manifest.json`);
  if (!manifestResponse.ok) throw new Error(`Fixture manifest unavailable (${manifestResponse.status})`);
  const manifest = await manifestResponse.json() as PublicManifest;
  const traceInputs: Record<string, unknown[]> = {};
  const outcomeInputs: Record<string, unknown> = {};
  await Promise.all(manifest.runs.map(async (run) => {
    const [traceResponse, outcomeResponse] = await Promise.all([
      fetch(`${fixtureBase}${run.trace_path}`),
      fetch(`${fixtureBase}${run.outcome_path}`)
    ]);
    if (!traceResponse.ok) throw new Error(`Trace unavailable for ${run.policy.label}`);
    if (!outcomeResponse.ok) throw new Error(`Outcome unavailable for ${run.policy.label}`);
    traceInputs[run.run_id] = parseJsonLines(await traceResponse.text());
    outcomeInputs[run.run_id] = await outcomeResponse.json();
  }));
  return validateBundle(manifest, traceInputs, outcomeInputs);
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `T+${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function titleCase(value: string) {
  return value.replaceAll(".", " · ").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const ACTION_LABELS: Record<string, string> = {
  observe: "观测", process: "处理", retain: "保留证据", discard: "丢弃",
  downlink: "下传", revisit: "重访", request_cross_sensor: "请求跨传感器证据",
  escalate: "升级人工处置", abstain: "弃权"
};

const EVENT_LABELS: Record<string, string> = {
  "mission.started": "任务启动", "plan.validated": "计划通过验证",
  "observation.acquired": "完成观测", "evidence.produced": "生成证据",
  "belief.updated": "更新信念", "resource.updated": "更新资源状态",
  "constraint.activated": "约束生效", "constraint.cleared": "约束解除",
  "action.proposed": "提出行动", "action.selected": "选定行动",
  "action.rejected": "拒绝行动", "action.started": "开始行动",
  "action.completed": "完成行动", "action.failed": "行动失败",
  "action.abstained": "系统弃权", "outcome.updated": "更新任务结果"
};

const REASON_LABELS: Record<string, string> = {
  "Acquire the same primary observation as the fixed policy.": "获取与 fixed policy 相同的首次观测，确保初始条件可比较。",
  "Acquire the preplanned primary observation.": "获取预先规划的首次观测。",
  "Evaluate whether the primary evidence passes the mission gate.": "评估首次证据是否达到任务完成门槛。",
  "Retain and compact rare evidence because the confidence gate has not passed and the link is unavailable.": "置信度尚未过门且链路不可用，因此保留并压缩稀缺证据。",
  "Request a compact revisit to resolve the remaining uncertainty.": "请求一次轻量重访，以消除剩余不确定性。",
  "Attempt the preplanned downlink despite current link state.": "fixed policy 尝试执行预排下传，但必须接受当前链路约束验证。",
  "Acquire the fixed follow-up observation.": "按 fixed policy 获取后续观测。",
  "Process the primary observation on the fixed schedule.": "按照 fixed schedule 处理首次观测。",
  "Process the fixed follow-up observation.": "按 fixed policy 处理后续观测。",
  "Fuse the revisit evidence with the retained rare signature.": "将重访证据与已保留的稀有光谱特征融合。",
  "Downlink only the compact evidence package needed to support the conclusion.": "只下传足以支持任务结论的紧凑证据包。",
  "Downlink the fixed follow-up package when the link returns.": "链路恢复后，下传 fixed policy 的后续数据包。",
  "Synthetic link blackout window is active.": "合成链路中断窗口已生效。",
  "Synthetic link blackout window ended.": "合成链路中断窗口已结束。",
  "Evidence threshold passed and selected evidence was downlinked.": "证据已越过置信度门槛，且选定证据已完成下传。",
  "rare-mineral-signature-present": "稀有矿物光谱特征存在",
  "link_unavailable": "链路不可用，确定性授权器拒绝执行。"
};

function domainLabel(value: string) {
  return ACTION_LABELS[value] ?? EVENT_LABELS[value] ?? titleCase(value);
}

function reasonLabel(value: unknown) {
  const text = String(value ?? "");
  return REASON_LABELS[text] ?? text;
}

function objectiveLabel(value: string) {
  if (value === "Reach an evidence-supported conclusion before the synthetic deadline.") {
    return "在合成截止时间前，形成有证据支持的任务结论";
  }
  if (value.includes("rare mineral") || value.includes("rare-mineral")) {
    return "在截止时间与下传预算内，获取足够证据确认稀有矿物光谱特征";
  }
  return value;
}

function centralAngleDegrees(longitudeA: number, latitudeA: number, longitudeB: number, latitudeB: number) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeARad = toRadians(latitudeA);
  const latitudeBRad = toRadians(latitudeB);
  const cosine = Math.sin(latitudeARad) * Math.sin(latitudeBRad)
    + Math.cos(latitudeARad) * Math.cos(latitudeBRad) * Math.cos(toRadians(longitudeA - longitudeB));
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}

function satelliteMarker(accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 144;
  canvas.height = 88;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.shadowColor = accent;
  context.shadowBlur = 15;
  context.fillStyle = "#183d5c";
  context.strokeStyle = "#74d8f0";
  context.lineWidth = 2;
  context.fillRect(5, 29, 48, 30);
  context.strokeRect(5, 29, 48, 30);
  context.fillRect(91, 29, 48, 30);
  context.strokeRect(91, 29, 48, 30);
  context.strokeStyle = "rgba(116,216,240,.45)";
  for (let x = 13; x < 53; x += 10) {
    context.beginPath(); context.moveTo(x, 29); context.lineTo(x, 59); context.stroke();
  }
  for (let x = 99; x < 139; x += 10) {
    context.beginPath(); context.moveTo(x, 29); context.lineTo(x, 59); context.stroke();
  }
  context.fillStyle = "#d9e9e6";
  context.strokeStyle = "#ffffff";
  context.fillRect(55, 22, 34, 43);
  context.strokeRect(55, 22, 34, 43);
  context.fillStyle = accent;
  context.beginPath();
  context.arc(72, 43.5, 8, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = accent;
  context.lineWidth = 3;
  context.beginPath(); context.moveTo(72, 65); context.lineTo(72, 82); context.stroke();
  return canvas;
}

function WorldView({
  projection,
  simTime,
  maxTime,
  mode,
  focusEventType,
  scenario
}: {
  projection: ReturnType<typeof projectEvents>;
  simTime: number;
  maxTime: number;
  mode: Mode;
  focusEventType?: string;
  scenario: ScenarioConfig;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const aoi = projection.areaOfInterest;
  const currentEventType = focusEventType ?? projection.currentEvent?.type ?? "mission.started";
  const observationId = String(projection.observation?.observation_id ?? "");
  const footprint = Array.isArray(projection.observation?.footprint)
    ? projection.observation.footprint as number[]
    : [];
  const beliefPassed = Boolean(projection.belief?.gate_passed);
  const contactAvailable = projection.resources.find((resource) => resource.name === "contact")?.normalized_value !== 0;
  const worldAction = String(projection.decision?.action_type ?? projection.decision?.selected_action_type ?? "");
  const orbitPosition = missionOrbitPosition(aoi, simTime, maxTime);
  const orbitProfile = missionOrbitProfile(maxTime);
  const reducedMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const viewer = new Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      baseLayer: false,
      requestRenderMode: true
    });
    viewer.scene.globe.baseColor = Color.fromCssColorString("#0b2632");
    viewer.scene.backgroundColor = Color.fromCssColorString("#061117");
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(-117.2, 24, 12_000_000),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-72), roll: 0 }
    });
    let disposed = false;
    void TileMapServiceImageryProvider.fromUrl(buildModuleUrl("Assets/Textures/NaturalEarthII")).then((provider) => {
      if (disposed || viewer.isDestroyed()) return;
      const layer = viewer.imageryLayers.addImageryProvider(provider);
      layer.brightness = 0.66;
      layer.contrast = 1.12;
      layer.saturation = 0.72;
      viewer.scene.requestRender();
    });
    viewerRef.current = viewer;
    return () => {
      disposed = true;
      viewerRef.current = null;
      if (!viewer.isDestroyed()) viewer.destroy();
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.entities.removeAll();
    if (aoi.length === 4) {
      const [west, south, east, north] = aoi;
      const centerLongitude = (west + east) / 2;
      const centerLatitude = (south + north) / 2;
      viewer.entities.add({
        id: "mission-aoi",
        polygon: {
          hierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArray([west, south, east, south, east, north, west, north])),
          height: 0,
          material: Color.fromCssColorString(scenario.accent).withAlpha(0.16),
          outline: true,
          outlineColor: Color.fromCssColorString(scenario.accent)
        }
      });
      const track = missionOrbitTrack(aoi);
      viewer.entities.add({
        id: "mission-orbit",
        polyline: {
          positions: track.map((position) => Cartesian3.fromDegrees(position.longitude, position.latitude, position.altitudeM)),
          width: 1.6,
          material: new PolylineDashMaterialProperty({
            color: Color.fromCssColorString(scenario.accent).withAlpha(0.56),
            dashLength: 18
          })
        }
      });
      viewer.entities.add({
        id: "mission-ground-track",
        polyline: {
          positions: track.map((position) => Cartesian3.fromDegrees(position.longitude, position.latitude, 12_000)),
          width: 1,
          material: new PolylineDashMaterialProperty({ color: Color.WHITE.withAlpha(0.18), dashLength: 8 })
        }
      });
      viewer.entities.add({
        id: "mission-ground-station",
        position: Cartesian3.fromDegrees(centerLongitude + 7, centerLatitude - 4),
        point: {
          pixelSize: 6,
          color: Color.fromCssColorString("#63d49b"),
          outlineColor: Color.fromCssColorString("#071219"),
          outlineWidth: 2
        },
        label: {
          text: scenario.stationLabel,
          font: "11px ui-monospace, monospace",
          fillColor: Color.fromCssColorString("#b9d9d4"),
          outlineColor: Color.fromCssColorString("#071219"),
          outlineWidth: 3,
          style: LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cartesian2(0, 16)
        }
      });
      viewer.entities.add({
        id: "mission-node",
        position: Cartesian3.fromDegrees(orbitPosition.longitude, orbitPosition.latitude, orbitPosition.altitudeM),
        point: {
          pixelSize: 6,
          color: Color.fromCssColorString("#6ee7f2"),
          outlineColor: Color.fromCssColorString("#071219"),
          outlineWidth: 3,
          heightReference: HeightReference.NONE,
          scaleByDistance: new NearFarScalar(1e5, 1.3, 8e6, 0.5)
        },
        billboard: {
          image: satelliteMarker(scenario.accent),
          width: 72,
          height: 44,
          scaleByDistance: new NearFarScalar(4e5, 1.15, 1.6e7, 0.55)
        },
        label: {
          text: new ConstantProperty(`${scenario.assetLabel} · T+00:00`),
          font: "12px ui-monospace, monospace",
          fillColor: Color.fromCssColorString("#d8f7f3"),
          outlineColor: Color.fromCssColorString("#071219"),
          outlineWidth: 4,
          style: LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cartesian2(0, -22)
        }
      });
      viewer.entities.add({
        id: "mission-sensor-line",
        show: false,
        polyline: {
          positions: [
            Cartesian3.fromDegrees(centerLongitude - 70, centerLatitude, 520_000),
            Cartesian3.fromDegrees(centerLongitude, centerLatitude)
          ],
          width: 1.5,
          material: new ColorMaterialProperty(Color.fromCssColorString("#f3bd5b").withAlpha(0.72))
        }
      });
      [0, 1, 2, 3].forEach((index) => {
        viewer.entities.add({
          id: `mission-sensor-edge-${index}`,
          show: false,
          polyline: {
            positions: [
              Cartesian3.fromDegrees(orbitPosition.longitude, orbitPosition.latitude, orbitPosition.altitudeM),
              Cartesian3.fromDegrees(centerLongitude, centerLatitude)
            ],
            width: 1,
            material: new ColorMaterialProperty(Color.fromCssColorString("#f3bd5b").withAlpha(0.34))
          }
        });
      });
      viewer.entities.add({
        id: "mission-contact-link",
        polyline: {
          positions: [
            Cartesian3.fromDegrees(centerLongitude - 70, centerLatitude, 520_000),
            Cartesian3.fromDegrees(centerLongitude + 7, centerLatitude - 4)
          ],
          width: 1.5,
          material: new ColorMaterialProperty(Color.fromCssColorString("#63d49b").withAlpha(0.74))
        }
      });
      if (scenario.sceneKind === "wildfire") {
        viewer.entities.add({
          id: "wildfire-perimeter",
          show: false,
          polygon: {
            hierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArray([
              centerLongitude - 1.6, centerLatitude - 1.1,
              centerLongitude + 1.8, centerLatitude - 0.7,
              centerLongitude + 1.2, centerLatitude + 1.4,
              centerLongitude - 1.3, centerLatitude + 1.1
            ])),
            height: 0,
            material: Color.fromCssColorString("#ef6d65").withAlpha(0.22),
            outline: true,
            outlineColor: Color.fromCssColorString("#ff9d57")
          }
        });
        [[-0.9, 0.4], [0.25, -0.45], [1.0, 0.65]].forEach(([longitude, latitude], index) => {
          viewer.entities.add({
            id: `wildfire-hotspot-${index}`,
            show: false,
            position: Cartesian3.fromDegrees(centerLongitude + longitude!, centerLatitude + latitude!),
            point: {
              pixelSize: 7 + index * 2,
              color: Color.fromCssColorString(index === 2 ? "#ef6d65" : "#ff9d57"),
              outlineColor: Color.fromCssColorString("#071219"),
              outlineWidth: 2
            }
          });
        });
      }
      if (scenario.sceneKind === "search") {
        [-1.5, -0.5, 0.5, 1.5].forEach((offset, index) => {
          viewer.entities.add({
            id: `search-leg-${index}`,
            show: index === 0,
            polyline: {
              positions: [
                Cartesian3.fromDegrees(west + 0.8, centerLatitude + offset),
                Cartesian3.fromDegrees(east - 0.8, centerLatitude + offset)
              ],
              width: 1,
              material: new PolylineDashMaterialProperty({
                color: Color.fromCssColorString("#6eb8f2").withAlpha(0.48),
                dashLength: 9
              })
            }
          });
        });
        viewer.entities.add({
          id: "search-candidate",
          show: false,
          position: Cartesian3.fromDegrees(centerLongitude + 1.2, centerLatitude - 0.35),
          point: {
            pixelSize: 10,
            color: Color.fromCssColorString("#f3bd5b"),
            outlineColor: Color.fromCssColorString("#071219"),
            outlineWidth: 3
          },
          label: {
            text: "候选目标 / CONTACT",
            font: "11px ui-monospace, monospace",
            fillColor: Color.fromCssColorString("#f3bd5b"),
            outlineColor: Color.fromCssColorString("#071219"),
            outlineWidth: 3,
            style: LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cartesian2(0, 18)
          }
        });
      }
    }
    viewer.scene.requestRender();
  }, [aoi, scenario]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || aoi.length !== 4) return;
    viewer.entities.removeById("mission-footprint");
    if (observationId && footprint.length === 4) {
      const [west, south, east, north] = footprint;
      viewer.entities.add({
        id: "mission-footprint",
        polygon: {
          hierarchy: new PolygonHierarchy(Cartesian3.fromDegreesArray([west, south, east, south, east, north, west, north])),
          height: 0,
          material: Color.fromCssColorString(beliefPassed ? "#63d49b" : "#f3bd5b").withAlpha(0.28),
          outline: true,
          outlineColor: Color.fromCssColorString(beliefPassed ? "#63d49b" : "#f3bd5b")
        }
      });
    }
    viewer.scene.requestRender();
  }, [aoi, observationId, footprint, beliefPassed]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || aoi.length !== 4) return;
    const [west, south, east, north] = aoi;
    const centerLongitude = (west + east) / 2;
    const centerLatitude = (south + north) / 2;
    const satellitePosition = Cartesian3.fromDegrees(orbitPosition.longitude, orbitPosition.latitude, orbitPosition.altitudeM);
    const targetPosition = Cartesian3.fromDegrees(centerLongitude, centerLatitude);
    const groundPosition = Cartesian3.fromDegrees(centerLongitude + 7, centerLatitude - 4);
    const satellite = viewer.entities.getById("mission-node");
    const sensorLine = viewer.entities.getById("mission-sensor-line");
    const contactLink = viewer.entities.getById("mission-contact-link");
    if (satellite) {
      satellite.position = new ConstantPositionProperty(satellitePosition);
      if (satellite.point) {
        satellite.point.color = new ConstantProperty(Color.fromCssColorString(
          projection.activeConstraints.length ? "#f3bd5b" : beliefPassed ? "#63d49b" : scenario.accent
        ));
        satellite.point.pixelSize = new ConstantProperty(
          currentEventType === "observation.acquired" || currentEventType === "evidence.produced" ? 13 : 9
        );
      }
      if (satellite.label) satellite.label.text = new ConstantProperty(`${scenario.assetLabel} · ${formatTime(simTime)}`);
    }
    if (sensorLine?.polyline) {
      const withinSensorHorizon = centralAngleDegrees(orbitPosition.longitude, orbitPosition.latitude, centerLongitude, centerLatitude) <= 24;
      const sensorVisible = withinSensorHorizon && (["observe", "revisit", "process"].includes(worldAction)
        || currentEventType === "observation.acquired"
        || currentEventType === "evidence.produced");
      sensorLine.show = sensorVisible;
      sensorLine.polyline.positions = new ConstantProperty([satellitePosition, targetPosition]);
      const corners = footprint.length === 4
        ? [[footprint[0], footprint[1]], [footprint[2], footprint[1]], [footprint[2], footprint[3]], [footprint[0], footprint[3]]]
        : [[west, south], [east, south], [east, north], [west, north]];
      corners.forEach(([longitude, latitude], index) => {
        const edge = viewer.entities.getById(`mission-sensor-edge-${index}`);
        if (!edge?.polyline) return;
        edge.show = sensorVisible;
        edge.polyline.positions = new ConstantProperty([satellitePosition, Cartesian3.fromDegrees(longitude!, latitude!)]);
      });
    }
    if (contactLink?.polyline) {
      contactLink.show = centralAngleDegrees(orbitPosition.longitude, orbitPosition.latitude, centerLongitude + 7, centerLatitude - 4) <= 24;
      contactLink.polyline.positions = new ConstantProperty([satellitePosition, groundPosition]);
      contactLink.polyline.material = contactAvailable
        ? new ColorMaterialProperty(Color.fromCssColorString("#63d49b").withAlpha(0.74))
        : new PolylineDashMaterialProperty({ color: Color.fromCssColorString("#f3bd5b").withAlpha(0.82), dashLength: 10 });
    }
    if (scenario.sceneKind === "wildfire") {
      const visible = Boolean(projection.observation);
      const perimeter = viewer.entities.getById("wildfire-perimeter");
      if (perimeter) perimeter.show = visible;
      [0, 1, 2].forEach((index) => {
        const hotspot = viewer.entities.getById(`wildfire-hotspot-${index}`);
        if (!hotspot) return;
        hotspot.show = visible;
        if (hotspot.point) {
          hotspot.point.pixelSize = new ConstantProperty((7 + index * 2) * (beliefPassed ? 1.35 : 1));
          hotspot.point.color = new ConstantProperty(Color.fromCssColorString(
            beliefPassed ? "#ef6d65" : index === 2 ? "#ef6d65" : "#ff9d57"
          ));
        }
      });
    }
    if (scenario.sceneKind === "search") {
      const completedFraction = Math.min(1, simTime / Math.max(1, maxTime * 0.7));
      [0, 1, 2, 3].forEach((index) => {
        const leg = viewer.entities.getById(`search-leg-${index}`);
        if (leg) leg.show = completedFraction >= index / 4;
      });
      const candidate = viewer.entities.getById("search-candidate");
      if (candidate) {
        candidate.show = Boolean(projection.evidence);
        if (candidate.point) {
          candidate.point.color = new ConstantProperty(Color.fromCssColorString(beliefPassed ? "#63d49b" : "#f3bd5b"));
          candidate.point.pixelSize = new ConstantProperty(beliefPassed ? 14 : 10);
        }
      }
    }
    viewer.scene.requestRender();
  }, [aoi, simTime, maxTime, currentEventType, contactAvailable, beliefPassed, projection.activeConstraints, projection.observation, projection.evidence, worldAction, scenario, footprint, orbitPosition]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || aoi.length !== 4) return;
    if (mode !== "story") {
      viewer.camera.lookAtTransform(Matrix4.IDENTITY);
      return;
    }
    const satellitePosition = Cartesian3.fromDegrees(orbitPosition.longitude, orbitPosition.latitude, orbitPosition.altitudeM);
    const heading = reducedMotion ? CesiumMath.toRadians(18) : CesiumMath.toRadians(18 + (simTime / Math.max(1, maxTime)) * 16);
    viewer.camera.lookAt(
      satellitePosition,
      new HeadingPitchRange(heading, CesiumMath.toRadians(-30), storyCameraRange(currentEventType))
    );
    viewer.scene.requestRender();
  }, [mode, currentEventType, aoi, orbitPosition, reducedMotion, simTime, maxTime]);

  return (
    <section className="world-panel panel" aria-label="Mission world view">
      <div className="panel-heading overlay-heading">
        <div>
          <span className="eyebrow">{mode === "story" ? "全球任务态势 / GLOBAL MISSION VIEW" : "任务空间 / AOI"}</span>
          <h2>{mode === "story" ? `${scenario.assetLabel} · 近极地任务轨道` : "证据获取几何关系"}</h2>
        </div>
        <span className={`status-chip ${mode === "story" ? "replay" : ""}`}>{mode === "story" ? "全球跟随 / WIDE TRACK" : "自由观察"}</span>
      </div>
      <div className="world-canvas" ref={containerRef} aria-hidden="true" />
      {mode === "story" && (
        <PayloadView
          position={orbitPosition}
          eventType={currentEventType}
          actionType={worldAction}
          sceneKind={scenario.sceneKind}
          accent={scenario.accent}
          hasEvidence={Boolean(projection.evidence)}
          beliefScore={num(projection.belief?.score)}
          beliefPassed={beliefPassed}
          linkOffline={!contactAvailable}
          reducedMotion={reducedMotion}
        />
      )}
      <div className="world-legend" aria-label="世界视图文字说明">
        <span><i className="dot cyan" style={{ background: scenario.accent }} />{scenario.aoiLabel}</span>
        <span><i className="dot amber" />轨道高 {Math.round(orbitProfile.altitudeM / 1000)} km · 周期 {Math.round(orbitProfile.periodS / 60)} min</span>
        <span>重访间隔折叠 {Math.round(orbitProfile.repeatCycleS / 3600)} h · 平均 {Math.round(orbitProfile.timeCompression)}×</span>
        <span className={contactAvailable ? "contact-online" : "contact-offline"}>{contactAvailable ? "链路可用" : "链路中断"}</span>
      </div>
    </section>
  );
}

function StoryStageRail({
  policy,
  simTime,
  maxTime,
  events,
  onSeek
}: {
  policy: PolicyKind;
  simTime: number;
  maxTime: number;
  events: PublicRuntimeEvent[];
  onSeek: (time: number) => void;
}) {
  const stages = storyStages(policy, events);
  const activeStage = storyStageIndex(policy, simTime, events);
  return (
    <nav className="story-stage-rail panel" aria-label="任务叙事阶段">
      <div className="story-stage-meta">
        <span className="eyebrow">任务进程</span>
        <b>阶段 {activeStage + 1} / {stages.length}</b>
      </div>
      <div className="story-stage-flow">
        <div className="story-stage-progress" aria-hidden="true"><i style={{ width: `${Math.min(100, (simTime / maxTime) * 100)}%` }} /></div>
        <div className="story-stage-buttons">
          {stages.map((stage, index) => (
            <button
              className={index === activeStage ? "active" : index < activeStage ? "complete" : ""}
              key={stage.id}
              onClick={() => onSeek(stage.anchorTime)}
              aria-current={index === activeStage ? "step" : undefined}
            >
              <i>{index < activeStage ? "✓" : String(index + 1).padStart(2, "0")}</i>
              <span>{stage.label}</span>
            </button>
          ))}
        </div>
      </div>
      <span className={`story-policy ${policy}`}>{policy === "adaptive" ? "自适应策略" : "固定策略"}</span>
    </nav>
  );
}

function StoryNarrative({
  beat,
  event,
  simTime,
  beliefScore,
  gate
}: {
  beat: StoryBeat;
  event?: PublicRuntimeEvent;
  simTime: number;
  beliefScore: number;
  gate: number;
}) {
  const gap = Math.max(0, gate - beliefScore);
  return (
    <aside className={`story-narrative panel ${beat.tone}`}>
      <div className="story-narrative-heading">
        <span className="eyebrow">{beat.eyebrow}</span>
        <span className="story-time" aria-hidden="true">{formatTime(simTime)}</span>
      </div>
      <h1>{beat.title}</h1>
      <div className="story-event-chip" role="status" aria-live="polite"><i />{event ? domainLabel(event.type) : "任务已初始化"}</div>
      <dl className="story-explanation">
        <div><dt>为什么重要</dt><dd>{beat.why}</dd></div>
        <div><dt>系统如何响应</dt><dd>{beat.response}</dd></div>
        <div><dt>即时影响</dt><dd>{beat.impact}</dd></div>
      </dl>
      <div className="story-belief-summary">
        <div><span>当前 Belief</span><b>{Math.round(beliefScore * 100)}%</b></div>
        <div className="story-belief-track"><i style={{ width: `${beliefScore * 100}%` }} /><em style={{ left: `${gate * 100}%` }} /></div>
        <small>{gap > 0 ? `距离任务门还差 ${Math.round(gap * 100)}%` : "已越过任务门"}</small>
      </div>
      <p className="trace-note">画面、文字与状态均来自同一条 Public Runtime Trace。</p>
    </aside>
  );
}

function StoryPlayback({
  playing,
  simTime,
  maxTime,
  speed,
  onPlay,
  onReset,
  onStep,
  onSeek,
  onSpeed,
  onExit
}: {
  playing: boolean;
  simTime: number;
  maxTime: number;
  speed: number;
  onPlay: () => void;
  onReset: () => void;
  onStep: (direction: -1 | 1) => void;
  onSeek: (time: number) => void;
  onSpeed: (speed: number) => void;
  onExit: () => void;
}) {
  return (
    <section className="story-playback panel" aria-label="叙事回放控制">
      <div className="story-playback-controls">
        <button aria-label="重置回放" onClick={onReset}>↺</button>
        <button aria-label="上一个事件" onClick={() => onStep(-1)}>‹</button>
        <button className="play-button" aria-label={playing ? "暂停回放" : "播放回放"} onClick={onPlay}>{playing ? "Ⅱ" : "▶"}</button>
        <button aria-label="下一个事件" onClick={() => onStep(1)}>›</button>
        <b>{formatTime(simTime)}</b>
      </div>
      <input aria-label="叙事任务时间线" type="range" min="0" max={maxTime} step="0.1" value={simTime} onChange={(event) => onSeek(Number(event.target.value))} />
      <select aria-label="回放速度" value={speed} onChange={(event) => onSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select>
      <button className="story-exit" onClick={onExit}>进入操作模式检查细节</button>
    </section>
  );
}

function StoryConclusion({
  outcomes,
  onInspect
}: {
  outcomes: Record<string, TraceBundle["outcomesByRun"][string]>;
  onInspect: () => void;
}) {
  const fixed = outcomes.fixed;
  const adaptive = outcomes.adaptive;
  return (
    <section className="story-conclusion panel" aria-label="任务策略对比结论">
      <div>
        <span className="eyebrow">任务复盘 / COUNTERFACTUAL</span>
        <h2>Adaptive Policy 选择的不是更多数据，而是更有价值的下一次观测。</h2>
      </div>
      <dl>
        <div><dt>硬约束违规</dt><dd><del>{num(fixed?.hard_constraint_violations)}</del><b>{num(adaptive?.hard_constraint_violations)}</b></dd></div>
        <div><dt>效用 / MB</dt><dd><del>{num(fixed?.utility_per_transmitted_mb).toFixed(2)}</del><b>{num(adaptive?.utility_per_transmitted_mb).toFixed(2)}</b></dd></div>
        <div><dt>认知时间 TTK</dt><dd><del>{num(fixed?.time_to_knowledge_s)}s</del><b>{num(adaptive?.time_to_knowledge_s)}s</b></dd></div>
      </dl>
      <button onClick={onInspect}>检查完整因果链</button>
    </section>
  );
}

function IntelligenceStack() {
  const layers = [
    ["01", "语言任务", "DeepSeek 结构化提议"],
    ["02", "MissionIR", "Schema + 语义校验"],
    ["03", "Action Space", "能力、资源与权限目录"],
    ["04", "Policy Gate", "确定性授权 / 拒绝"],
    ["05", "Runtime Trace", "可回放的因果证据链"]
  ];
  return (
    <details className="intelligence-stack panel">
      <summary>
        <div><span className="eyebrow">技术栈 / TRUST BOUNDARY</span><b>模型负责推理，确定性系统负责授权</b></div>
        <span>展开系统壁垒</span>
      </summary>
      <div className="intelligence-flow">
        {layers.map(([index, title, description], layerIndex) => (
          <div className="intelligence-layer" key={title}>
            <i>{index}</i><span><b>{title}</b><small>{description}</small></span>
            {layerIndex < layers.length - 1 && <em>→</em>}
          </div>
        ))}
      </div>
      <div className="action-vocabulary">
        <span>CORE ACTION SPACE / v0</span>
        {(["observe", "process", "retain", "discard", "downlink", "revisit", "request_cross_sensor", "escalate", "abstain"] as const).map((action) => (
          <i className={action === "discard" || action === "request_cross_sensor" ? "supervised" : ""} key={action}>
            {action}<small>{action === "discard" || action === "request_cross_sensor" ? "supervised" : "autonomous"}</small>
          </i>
        ))}
      </div>
      <p>DeepSeek API key 只存在于私有 Core / Serverless Gateway；任何模型输出都必须经过 Contract、Action Catalog、Resource 与 Authority Gate。用户确认后也只会获得 Synthetic Sandbox 执行权限。</p>
    </details>
  );
}

interface AuthoringResponse {
  mission_ir: {
    schema_version: string;
    mission_id: string;
    objectives: Array<{ description: string; evidence_threshold: number }>;
    assets: Array<{ asset_id: string; capabilities: string[] }>;
    authority: string;
  };
  source: string;
  profile_id: string;
  provider: { id?: string; model?: string };
  authorization: { authorized: boolean; status: string; next_gate: string };
}

interface ExecutionResponse {
  schema_version: "mission-execution-response/v0";
  run_id: string;
  status: "accepted";
  execution_mode: "synthetic_sandbox";
  mission: { mission_id: string; objective: string };
  scenario: { id: ScenarioId; policy_kind: "adaptive"; fixture_version: string; trace_source: string };
  authorization: { authorized: true; scope: "synthetic_sandbox_only"; reason_codes: string[] };
  external_effects: false;
}

const AUTHORING_EXAMPLES: Record<ScenarioId, string> = {
  "adaptive-hsi": "确认目标区域的稀有矿物光谱特征；首次证据不足时安排重访，只下传改变结论所需的证据。",
  "wildfire-response": "在山火区域确认火线是否越过控制线；烟云遮挡时请求跨传感器证据，并优先下传火线变化。",
  "maritime-sar": "在燃料和通信窗口受限的海上搜索区确认遇险目标；放弃低价值网格并请求针对性重访。"
};

function MissionComposer({ scenarioId, onClose, onExecute }: { scenarioId: ScenarioId; onClose: () => void; onExecute: (mission: AuthoringResponse, execution: ExecutionResponse) => void }) {
  const [intent, setIntent] = useState(AUTHORING_EXAMPLES[scenarioId]);
  const [profile, setProfile] = useState<ScenarioId>(scenarioId);
  const [demoPassword, setDemoPassword] = useState("");
  const [result, setResult] = useState<AuthoringResponse>();
  const [composerError, setComposerError] = useState<string>();
  const [executionError, setExecutionError] = useState<string>();
  const [compiling, setCompiling] = useState(false);
  const [executing, setExecuting] = useState(false);
  const remoteGatewayUrl = import.meta.env.VITE_CORE_API_BASE_URL as string | undefined;
  const coreBaseUrl = remoteGatewayUrl || "http://127.0.0.1:8765";

  const compile = async () => {
    setCompiling(true);
    setComposerError(undefined);
    setResult(undefined);
    try {
      const response = await fetch(`${coreBaseUrl}/v1/missions/parse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(remoteGatewayUrl ? { "X-Mission-Demo-Password": demoPassword } : {})
        },
        body: JSON.stringify({ intent, profile })
      });
      const body = await response.json() as AuthoringResponse & { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? `Core rejected request (${response.status})`);
      setResult(body);
    } catch (reason) {
      setComposerError(reason instanceof Error ? reason.message : "无法连接本地 Mission Studio Core");
    } finally {
      setCompiling(false);
    }
  };

  const executeMission = async () => {
    if (!result || !remoteGatewayUrl) return;
    setExecuting(true);
    setExecutionError(undefined);
    try {
      const response = await fetch(`${coreBaseUrl}/v1/missions/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Mission-Demo-Password": demoPassword },
        body: JSON.stringify({ confirmed: true, profile: result.profile_id, mission_ir: result.mission_ir })
      });
      const body = await response.json() as ExecutionResponse & { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? `Execution Gate rejected request (${response.status})`);
      onExecute(result, body);
    } catch (reason) {
      setExecutionError(reason instanceof Error ? reason.message : "Sandbox execution failed");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="composer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="mission-composer" role="dialog" aria-modal="true" aria-labelledby="composer-title">
        <header>
          <div><span className="eyebrow">MISSION AUTHORING / PRIVATE CORE</span><h2 id="composer-title">用自然语言创建 MissionIR</h2></div>
          <button aria-label="关闭 Mission Authoring" onClick={onClose}>×</button>
        </header>
        <div className="composer-grid">
          <div className="composer-input">
            <label htmlFor="mission-intent">描述任务目标、约束和希望系统采取的策略</label>
            <textarea id="mission-intent" value={intent} onChange={(event) => setIntent(event.target.value)} rows={8} />
            {remoteGatewayUrl && (
              <label className="gateway-password" htmlFor="mission-demo-password">
                <span>演示密码 / SERVERLESS GATEWAY</span>
                <input
                  id="mission-demo-password"
                  type="password"
                  autoComplete="current-password"
                  value={demoPassword}
                  onChange={(event) => setDemoPassword(event.target.value)}
                  placeholder="输入演示密码后调用 DeepSeek"
                />
              </label>
            )}
            <div className="composer-examples">
              <span>受审能力配置</span>
              <button className={profile === "adaptive-hsi" ? "active" : ""} onClick={() => { setProfile("adaptive-hsi"); setIntent(AUTHORING_EXAMPLES["adaptive-hsi"]); }}>高光谱</button>
              <button className={profile === "wildfire-response" ? "active" : ""} onClick={() => { setProfile("wildfire-response"); setIntent(AUTHORING_EXAMPLES["wildfire-response"]); }}>野火响应</button>
              <button className={profile === "maritime-sar" ? "active" : ""} onClick={() => { setProfile("maritime-sar"); setIntent(AUTHORING_EXAMPLES["maritime-sar"]); }}>海上搜救</button>
            </div>
            <button className="compile-button" disabled={compiling || !intent.trim() || Boolean(remoteGatewayUrl && !demoPassword)} onClick={compile}>{compiling ? "DeepSeek 正在结构化任务…" : "编译 MissionIR Proposal"}</button>
            <small>{remoteGatewayUrl ? "请求经口令保护的 Serverless Gateway 转发。API key 不会进入浏览器；输出默认没有执行授权。" : "请求只发送到本地私有 Core。API key 不会进入浏览器；输出默认没有执行授权。"}</small>
          </div>
          <div className="composer-result" aria-live="polite">
            {!result && !composerError && <div className="composer-placeholder"><i>NL</i><span>语言意图</span><em>→</em><i>IR</i><span>严格契约</span><em>→</em><i>GATE</i><span>确定性授权</span></div>}
            {composerError && <div className="composer-error"><span>CORE OFFLINE / REJECTED</span><p>{composerError}</p><small>{remoteGatewayUrl ? "请检查演示密码，或稍后再试。" : "启动本地 Core authoring server 后可进行真实 DeepSeek 编译。"}</small></div>}
            {result && (
              <div className="compiled-mission">
                <div className="compiled-status"><span>VALIDATED PROPOSAL</span><b>{result.authorization.authorized ? "已授权" : "未授权 · 等待 Gate"}</b></div>
                <h3>{result.mission_ir.objectives[0]?.description}</h3>
                <dl>
                  <div><dt>Mission ID</dt><dd>{result.mission_ir.mission_id}</dd></div>
                  <div><dt>证据门</dt><dd>{Math.round((result.mission_ir.objectives[0]?.evidence_threshold ?? 0) * 100)}%</dd></div>
                  <div><dt>Authority</dt><dd>{result.mission_ir.authority}</dd></div>
                  <div><dt>Provider</dt><dd>{result.provider.id ?? result.source} / {result.provider.model ?? "deterministic"}</dd></div>
                  <div><dt>Capability Profile</dt><dd>{result.profile_id}</dd></div>
                </dl>
                <div className="compiled-assets"><span>已声明能力</span>{result.mission_ir.assets.flatMap((asset) => asset.capabilities).map((capability) => <i key={capability}>{capability}</i>)}</div>
                <div className="authorization-path"><span>下一道边界</span><p>{result.authorization.next_gate.replaceAll("+", " → ")}</p></div>
                {remoteGatewayUrl && (
                  <div className="execution-confirmation">
                    <div><span>SUPERVISED CONFIRMATION</span><b>只执行 Synthetic Sandbox</b></div>
                    <p>确认后，服务端会重新校验 capability、resource 与 authority，并启动该场景的 checked adaptive run。不会连接真实设备或产生外部操作。</p>
                    {executionError && <small>{executionError}</small>}
                    <button disabled={executing} onClick={executeMission}>{executing ? "正在通过 Execution Gate…" : "确认并在 Sandbox 执行"}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MissionGraph({ actions, currentAction }: { actions: Array<{ id: string; type: string }>; currentAction?: string }) {
  return (
    <div className="mission-graph" aria-label="已验证 Action Graph">
      {actions.slice(0, 6).map((action, index) => (
        <div className="graph-step" key={action.id}>
          <span className={`graph-node ${action.type === currentAction ? "active" : ""}`}>{String(index + 1).padStart(2, "0")}</span>
          <div><b>{domainLabel(action.type)}</b><small>{action.id}</small></div>
        </div>
      ))}
    </div>
  );
}

function ResourceRibbon({ resources }: { resources: Array<Record<string, unknown>> }) {
  const fallback = [
    { name: "power", normalized_value: 0.74, margin: 0.24, state: "nominal" },
    { name: "thermal", normalized_value: 0.48, margin: 0.32, state: "nominal" },
    { name: "compute", normalized_value: 0.63, margin: 0.27, state: "nominal" },
    { name: "storage", normalized_value: 0.83, margin: 0.17, state: "warning" },
    { name: "contact", normalized_value: 0, margin: 0, state: "unavailable" }
  ];
  const visible = resources.length ? resources : fallback;
  const resourceLabels: Record<string, string> = { power: "电量", thermal: "热", compute: "算力", storage: "存储", downlink: "下传", contact: "链路" };
  return (
    <section className="resource-ribbon panel" aria-label="合成资源状态">
      <div className="ribbon-label"><span className="eyebrow">资源状态</span><b>合成数据</b></div>
      {visible.map((resource) => {
        const current = resource as Record<string, unknown>;
        const name = String(current.name ?? "resource");
        const value = num(current.normalized_value, num(current.value, 0));
        const percent = value <= 1 ? value * 100 : value;
        const pressure = String(current.state ?? "").match(/warning|pressure|unavailable|violation/);
        return (
          <div className="resource" key={name}>
            <div><span>{resourceLabels[name] ?? name.toUpperCase()}</span><b>{Math.round(percent)}%</b></div>
            <div className="resource-track"><i className={pressure ? "pressure" : ""} style={{ width: `${Math.max(2, Math.min(100, percent))}%` }} /></div>
          </div>
        );
      })}
    </section>
  );
}

function OutcomeCard({ label, outcome, active }: { label: string; outcome?: TraceBundle["outcomesByRun"][string]; active: boolean }) {
  const data = outcome ?? {} as NonNullable<typeof outcome>;
  const complete = Boolean(data.completed);
  const violations = num(data.hard_constraint_violations);
  const gatePassed = complete && violations === 0;
  const gateLabel = gatePassed ? "任务门已通过" : complete ? "已完成 · 有硬约束违规" : "任务门未通过";
  return (
    <article className={`outcome-card ${active ? "active" : ""}`}>
      <div><span>{label}</span><b className={gatePassed ? "pass" : violations > 0 ? "violation" : "hold"}>{gateLabel}</b></div>
      <dl>
        <div><dt>认知时间 TTK</dt><dd>{data.time_to_knowledge_s == null ? "—" : `${data.time_to_knowledge_s}s`}</dd></div>
        <div><dt>效用 / MB</dt><dd>{num(data.utility_per_transmitted_mb).toFixed(2)}</dd></div>
        <div><dt>证据完整度</dt><dd>{Math.round(num(data.evidence_completeness) * 100)}%</dd></div>
        <div><dt>硬约束违规</dt><dd className={violations > 0 ? "violation" : ""}>{violations}</dd></div>
      </dl>
    </article>
  );
}

export function App() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [scenarioId, setScenarioId] = useState<ScenarioId>("adaptive-hsi");
  const [bundle, setBundle] = useState<TraceBundle>();
  const [error, setError] = useState<string>();
  const [policyKind, setPolicyKind] = useState<PolicyKind>("adaptive");
  const [mode, setMode] = useState<Mode>("operator");
  const [simTime, setSimTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [sandboxRun, setSandboxRun] = useState<ExecutionResponse>();
  const [authoredObjective, setAuthoredObjective] = useState<string>();
  const prefersReducedMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const scenario = scenarioConfig(scenarioId);

  useEffect(() => {
    setBundle(undefined);
    setError(undefined);
    loadBundle(scenario).then(setBundle).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unknown fixture error"));
  }, [scenario]);

  const run = bundle?.manifest.runs.find((item) => item.policy.kind === policyKind);
  const events = run ? bundle?.eventsByRun[run.run_id] ?? [] : [];
  const maxTime = useMemo(() => Math.max(1, ...Object.values(bundle?.eventsByRun ?? {}).flat().map((event) => event.sim_time_s)), [bundle]);
  const projection = useMemo(() => projectEvents(events, simTime), [events, simTime]);
  const selectedEvent = events.find((event) => event.event_id === selectedEventId) ?? projection.currentEvent;
  const chain = selectedEvent ? causalChain(events, selectedEvent.event_id) : [];
  const storyEvent = storyFocusEvent(events, simTime);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - previous) / 1000;
      previous = now;
      setSimTime((current) => {
        const next = Math.min(maxTime, current + elapsed * speed);
        if (next >= maxTime) setPlaying(false);
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, maxTime]);

  useEffect(() => {
    if (!selectedEventId) return;
    const stillExists = events.some((event) => event.event_id === selectedEventId);
    if (!stillExists) setSelectedEventId(undefined);
  }, [events, selectedEventId]);

  if (error) {
    return <main className="fatal-state"><span className="eyebrow">TRACE 被拒绝</span><h1>任务回放无法启动</h1><p>{error}</p><button onClick={() => location.reload()}>重新加载 fixture</button></main>;
  }
  if (!bundle || !run) {
    return <main className="loading-state"><div className="loader" /><span>正在验证公开 mission trace…</span></main>;
  }

  const currentAction = String(projection.decision?.action_type ?? projection.decision?.selected_action_type ?? "");
  const beliefScore = num(projection.belief?.belief, num(projection.belief?.score));
  const gate = num(projection.belief?.threshold, projection.successGate);
  const outcomes = Object.fromEntries(bundle.manifest.runs.map((manifestRun) => [manifestRun.policy.kind, bundle.outcomesByRun[manifestRun.run_id]]));
  const currentStoryBeat = storyBeat(scenarioId, policyKind, simTime, beliefScore, gate, maxTime, events);

  const step = (direction: -1 | 1) => {
    const candidates = events.map((event) => event.sim_time_s);
    const target = direction > 0 ? candidates.find((time) => time > simTime) : [...candidates].reverse().find((time) => time < simTime);
    if (target !== undefined) setSimTime(target);
  };

  const startSandboxRun = (mission: AuthoringResponse, execution: ExecutionResponse) => {
    setSandboxRun(execution);
    setAuthoredObjective(mission.mission_ir.objectives[0]?.description);
    setScenarioId(execution.scenario.id);
    setPolicyKind("adaptive");
    setMode("story");
    setSpeed(1);
    setSimTime(0);
    setSelectedEventId(undefined);
    setComposerOpen(false);
    setPlaying(!prefersReducedMotion);
  };

  return (
    <main
      className={`studio-shell ${mode === "story" ? "story-layout" : "operator-layout"}`}
      style={{ "--scenario-accent": scenario.accent, "--scenario-accent-rgb": scenario.accentRgb } as CSSProperties}
    >
      <header className="topbar">
        <div className="brand"><span className="brand-mark">MS</span><div><b>MISSION STUDIO</b><small>{scenario.shortTitle} / 公开回放</small></div></div>
        <div className="mission-title"><span className="eyebrow">任务意图 / MISSION INTENT</span><strong>{authoredObjective ?? objectiveLabel(projection.objective)}</strong></div>
        <div className="header-controls">
          <span className="status-chip replay">{sandboxRun ? "Sandbox Run" : "离线 Trace 回放"}</span><span className="status-chip synthetic">合成数据</span>
          <button className="composer-trigger" onClick={() => setComposerOpen(true)}>＋ 语言创建任务</button>
          <div className="segmented" aria-label="体验模式">
            {(["operator", "story"] as Mode[]).map((item) => <button aria-pressed={mode === item} className={mode === item ? "selected" : ""} key={item} onClick={() => {
              setMode(item);
              if (item === "story") {
                if (simTime >= maxTime) setSimTime(0);
                setSelectedEventId(undefined);
                setPlaying(!prefersReducedMotion);
              } else {
                setPlaying(false);
              }
            }}>{item === "operator" ? "操作模式" : "叙事模式"}</button>)}
          </div>
        </div>
      </header>

      <nav className="case-switcher" aria-label="演示场景">
        <div><span className="eyebrow">MISSION CASES</span><b>选择任务</b></div>
        {SCENARIOS.map((item, index) => (
          <button
            className={scenarioId === item.id ? "active" : ""}
            aria-current={scenarioId === item.id ? "page" : undefined}
            key={item.id}
            onClick={() => {
              setScenarioId(item.id);
              setSimTime(0);
              setPlaying(mode === "story" && !prefersReducedMotion);
              setSelectedEventId(undefined);
              setPolicyKind("adaptive");
              setSandboxRun(undefined);
              setAuthoredObjective(undefined);
            }}
          >
            <i>{String(index + 1).padStart(2, "0")}</i>
            <span><b>{item.shortTitle}</b><small>{item.title}</small></span>
          </button>
        ))}
      </nav>

      {sandboxRun && (
        <aside className="sandbox-run-banner" aria-live="polite">
          <i />
          <div><span>SYNTHETIC SANDBOX / 已确认执行</span><b>{sandboxRun.mission.objective}</b></div>
          <small>{sandboxRun.run_id} · Adaptive Policy · 无外部影响</small>
          <button aria-label="关闭 Sandbox run 状态" onClick={() => { setSandboxRun(undefined); setAuthoredObjective(undefined); }}>×</button>
        </aside>
      )}

      {mode === "story" && (
        <StoryStageRail
          policy={policyKind}
          simTime={simTime}
          maxTime={maxTime}
          events={events}
          onSeek={(time) => { setPlaying(false); setSimTime(time); }}
        />
      )}

      <div className={`workspace-grid ${mode === "story" ? "story-workspace" : ""}`}>
        {mode === "operator" && (
          <aside className="mission-panel panel">
            <div className="panel-heading"><div><span className="eyebrow">任务逻辑</span><h2>Intent → Action</h2></div><span className="gate-label">任务门 {(projection.successGate * 100).toFixed(0)}%</span></div>
            <div className="objective-card"><span>完成判据</span><p>在截止时间前使证据置信度越过阈值，并且不发生硬约束违规。</p></div>
            <div className="constraint-row"><span>当前约束</span>{projection.activeConstraints.length ? projection.activeConstraints.map((item) => <b key={item}>{domainLabel(item)}</b>) : <i>{formatTime(simTime)} 暂无生效约束</i>}</div>
            <MissionGraph actions={projection.actions} currentAction={currentAction} />
          </aside>
        )}

        <WorldView projection={projection} simTime={simTime} maxTime={maxTime} mode={mode} focusEventType={mode === "story" ? storyEvent?.type : undefined} scenario={scenario} />

        {mode === "story" ? (
          <StoryNarrative beat={currentStoryBeat} event={storyEvent} simTime={simTime} beliefScore={beliefScore} gate={gate} />
        ) : (
          <aside className="evidence-panel panel">
            <div className="panel-heading"><div><span className="eyebrow">信念 / 证据</span><h2>计划为何改变</h2></div><span className={`gate-dot ${beliefScore >= gate ? "passed" : "pending"}`} /> </div>
            <div className="belief-meter">
              <div><span>{String(projection.belief?.hypothesis ?? scenario.hypothesisLabel)}</span><b>{Math.round(beliefScore * 100)}%</b></div>
              <div className="belief-track"><i style={{ width: `${beliefScore * 100}%` }} /><em style={{ left: `${gate * 100}%` }} /></div>
              <small>完成门槛 <b>{Math.round(gate * 100)}%</b> · {beliefScore >= gate ? "已有充分证据支持" : "证据仍不完整"}</small>
            </div>
            <div className="evidence-card"><span>最新证据</span><p>{projection.evidence ? scenario.evidenceLabel : "等待由观测生成的证据。"}</p><small>{String(projection.evidence?.method ?? "尚无证据方法")} · {selectedEvent?.provenance.value_status ?? "synthetic"}</small></div>
            <div className="decision-card"><span>下一行动 / 原因</span><h3>{currentAction ? domainLabel(currentAction) : "等待已验证证据"}</h3><p>{reasonLabel(projection.decision?.reason ?? (Array.isArray(projection.decision?.reason_codes) ? (projection.decision.reason_codes as string[]).map(titleCase).join(" · ") : "确定性 policy 正在同时评估证据、权限与资源余量。"))}</p></div>
            <div className="causal-chain"><span>因果链</span>{chain.slice(-5).map((event) => <button key={event.event_id} onClick={() => { setSelectedEventId(event.event_id); setSimTime(event.sim_time_s); }}><i />{domainLabel(event.type)}<small>{formatTime(event.sim_time_s)}</small></button>)}</div>
          </aside>
        )}
      </div>

      {mode === "operator" && <ResourceRibbon resources={projection.resources} />}

      {mode === "operator" ? (
        <section className="timeline-panel panel">
          <div className="playback-controls">
            <button aria-label="重置回放" onClick={() => { setPlaying(false); setSimTime(0); setSelectedEventId(undefined); }}>↺</button>
            <button aria-label="上一个事件" onClick={() => step(-1)}>‹</button>
            <button className="play-button" aria-label={playing ? "暂停回放" : "播放回放"} onClick={() => setPlaying(!playing)}>{playing ? "Ⅱ" : "▶"}</button>
            <button aria-label="下一个事件" onClick={() => step(1)}>›</button>
            <select aria-label="回放速度" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select>
            <b>{formatTime(simTime)}</b>
          </div>
          <div className="timeline-track">
            <input aria-label="任务时间线" type="range" min="0" max={maxTime} step="0.1" value={simTime} onChange={(event) => { setPlaying(false); setSimTime(Number(event.target.value)); }} />
            <div className="event-ticks">{events.map((event) => <button aria-label={`${domainLabel(event.type)}，${formatTime(event.sim_time_s)}`} className={selectedEvent?.event_id === event.event_id ? "selected" : ""} key={event.event_id} style={{ left: `${(event.sim_time_s / maxTime) * 100}%` }} onClick={() => { setSimTime(event.sim_time_s); setSelectedEventId(event.event_id); }}><i /></button>)}</div>
          </div>
          <div className="event-readout"><span>{selectedEvent ? domainLabel(selectedEvent.type) : "任务就绪"}</span><p>{reasonLabel(selectedEvent?.payload.summary ?? selectedEvent?.payload.reason ?? selectedEvent?.payload.claim ?? selectedEvent?.payload.hypothesis ?? "选择事件以检查完整因果历史。")}</p><small>序号 {selectedEvent?.seq ?? 0} · {selectedEvent?.provenance.producer ?? "mission-studio"}</small></div>
        </section>
      ) : (
        <StoryPlayback
          playing={playing}
          simTime={simTime}
          maxTime={maxTime}
          speed={speed}
          onPlay={() => setPlaying(!playing)}
          onReset={() => { setPlaying(false); setSimTime(0); }}
          onStep={step}
          onSeek={(time) => { setPlaying(false); setSimTime(time); }}
          onSpeed={setSpeed}
          onExit={() => { setMode("operator"); setPlaying(false); }}
        />
      )}

      {mode === "operator" && (
        <section className="compare-panel panel">
          <div className="compare-heading"><div><span className="eyebrow">反事实对比</span><h2>同一任务，不同 policy</h2></div><div className="segmented policy-switch" aria-label="当前策略">{(["fixed", "adaptive"] as PolicyKind[]).map((kind) => <button aria-pressed={policyKind === kind} className={policyKind === kind ? "selected" : ""} key={kind} onClick={() => setPolicyKind(kind)}>{kind === "fixed" ? "固定策略" : "自适应策略"}</button>)}</div></div>
          <OutcomeCard label="FIXED POLICY / 固定策略" outcome={outcomes.fixed} active={policyKind === "fixed"} />
          <div className="comparison-mark"><span>↔</span><small>共享任务时钟<br />共享初始状态</small></div>
          <OutcomeCard label="ADAPTIVE POLICY / 自适应策略" outcome={outcomes.adaptive} active={policyKind === "adaptive"} />
        </section>
      )}

      {mode === "operator" && <IntelligenceStack />}

      {mode === "story" && simTime >= maxTime - 0.1 && (
        <StoryConclusion outcomes={outcomes} onInspect={() => { setMode("operator"); setPlaying(false); }} />
      )}

      {composerOpen && <MissionComposer scenarioId={scenarioId} onClose={() => setComposerOpen(false)} onExecute={startSandboxRun} />}
    </main>
  );
}
