import { useEffect, useMemo, useRef } from "react";
import type { OrbitPosition } from "./worldMotion";
import { payloadState } from "./payloadProjection";

interface PayloadViewProps {
  position: OrbitPosition;
  eventType: string;
  actionType: string;
  sceneKind: "spectral" | "wildfire" | "search";
  accent: string;
  hasEvidence: boolean;
  beliefScore: number;
  beliefPassed: boolean;
  linkOffline: boolean;
  reducedMotion: boolean;
}

function hash(x: number, y: number, seed: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function drawTerrain(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  sceneKind: PayloadViewProps["sceneKind"],
  seed: number,
  showEvidence: boolean,
  accent: string
) {
  const palette = sceneKind === "wildfire"
    ? ["#301d19", "#533127", "#744333", "#221818"]
    : sceneKind === "search"
      ? ["#082c3c", "#0c4053", "#105266", "#071f2e"]
      : ["#433a2d", "#635944", "#76684c", "#292d28"];
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(0.45, palette[1]);
  gradient.addColorStop(0.76, palette[2]);
  gradient.addColorStop(1, palette[3]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const cell = Math.max(13, width / 28);
  for (let y = -cell; y < height + cell; y += cell) {
    for (let x = -cell; x < width + cell; x += cell) {
      const noise = hash(Math.floor(x / cell), Math.floor(y / cell), seed);
      context.fillStyle = noise > 0.55 ? `rgba(235,226,180,${0.015 + noise * 0.035})` : `rgba(0,12,16,${0.025 + noise * 0.045})`;
      context.beginPath();
      context.moveTo(x, y + cell * noise);
      context.lineTo(x + cell, y + cell * (1 - noise));
      context.lineTo(x + cell, y + cell);
      context.lineTo(x, y + cell);
      context.fill();
    }
  }

  context.save();
  context.globalAlpha = 0.22;
  context.strokeStyle = sceneKind === "search" ? "#74c8db" : "#d1c58f";
  context.lineWidth = 1;
  for (let row = 0; row < 9; row += 1) {
    context.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const y = height * (0.16 + row * 0.1) + Math.sin(x * 0.025 + row + seed) * (6 + row * 0.8);
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
  context.restore();

  if (!showEvidence) return;
  const centerX = width * (0.58 + Math.sin(seed) * 0.05);
  const centerY = height * (0.48 + Math.cos(seed) * 0.04);
  const evidence = context.createRadialGradient(centerX, centerY, 2, centerX, centerY, width * 0.18);
  if (sceneKind === "wildfire") {
    evidence.addColorStop(0, "rgba(255,87,58,.82)");
    evidence.addColorStop(0.35, "rgba(255,157,87,.4)");
  } else if (sceneKind === "search") {
    evidence.addColorStop(0, "rgba(243,189,91,.9)");
    evidence.addColorStop(0.35, "rgba(110,184,242,.34)");
  } else {
    evidence.addColorStop(0, "rgba(243,189,91,.76)");
    evidence.addColorStop(0.35, `${accent}55`);
  }
  evidence.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = evidence;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = accent;
  context.lineWidth = 1.5;
  context.strokeRect(centerX - width * 0.095, centerY - height * 0.12, width * 0.19, height * 0.24);
}

export function PayloadView(props: PayloadViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useMemo(() => payloadState(
    props.eventType,
    props.actionType,
    props.hasEvidence,
    props.beliefPassed,
    props.linkOffline
  ), [props.eventType, props.actionType, props.hasEvidence, props.beliefPassed, props.linkOffline]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(1.5, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(bounds.width * ratio));
      const height = Math.max(1, Math.round(bounds.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, width, height);
      const seed = Math.round((props.position.longitude + 180) * 4) + Math.round((props.position.latitude + 90) * 4);
      drawTerrain(context, width, height, props.sceneKind, seed, state.showEvidence, props.accent);
      context.strokeStyle = `${props.accent}66`;
      context.lineWidth = 1;
      context.strokeRect(width * 0.18, height * 0.16, width * 0.64, height * 0.68);
      context.beginPath();
      context.moveTo(width / 2 - 13, height / 2);
      context.lineTo(width / 2 + 13, height / 2);
      context.moveTo(width / 2, height / 2 - 13);
      context.lineTo(width / 2, height / 2 + 13);
      context.stroke();
      if (state.scanning) {
        const fraction = props.reducedMotion ? 0.5 : ((props.position.physicalTimeS % 9) + 9) % 9 / 9;
        const scanY = height * (0.16 + fraction * 0.68);
        const scan = context.createLinearGradient(width * 0.18, scanY, width * 0.82, scanY);
        scan.addColorStop(0, "rgba(255,255,255,0)");
        scan.addColorStop(0.5, props.accent);
        scan.addColorStop(1, "rgba(255,255,255,0)");
        context.strokeStyle = scan;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(width * 0.18, scanY);
        context.lineTo(width * 0.82, scanY);
        context.stroke();
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [props.position, props.sceneKind, props.accent, props.reducedMotion, state]);

  return (
    <aside
      className={`payload-view ${state.phase} ${state.linkOffline ? "link-offline" : ""}`}
      aria-label={`载荷视角：${state.label}。卫星位于纬度 ${props.position.latitude.toFixed(1)} 度，经度 ${props.position.longitude.toFixed(1)} 度。${state.detail}`}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="payload-topline">
        <div><span>载荷视角</span><b>PAYLOAD / NADIR</b></div>
        <i>合成影像 / SYNTHETIC</i>
      </div>
      <div className="payload-coordinates">
        <span>LAT {props.position.latitude >= 0 ? "+" : ""}{props.position.latitude.toFixed(2)}°</span>
        <span>LON {props.position.longitude >= 0 ? "+" : ""}{props.position.longitude.toFixed(2)}°</span>
        <span>ALT {(props.position.altitudeM / 1000).toFixed(0)} KM</span>
      </div>
      <div className="payload-readout">
        <div><i /> <b>{state.label}</b></div>
        <span>{state.detail}</span>
      </div>
      <div className="payload-belief"><span>BELIEF</span><i><em style={{ width: `${Math.max(2, props.beliefScore * 100)}%` }} /></i><b>{Math.round(props.beliefScore * 100)}%</b></div>
    </aside>
  );
}
