import { useEffect, useMemo, useRef } from "react";
import type { OrbitPosition } from "./worldMotion";
import { payloadState } from "./payloadProjection";

interface PayloadViewProps {
  position: OrbitPosition;
  eventType: string;
  actionType: string;
  sceneKind: "spectral" | "wildfire" | "search";
  accent: string;
  imageSrc: string;
  imageLabel: string;
  imageCredit: string;
  imageSource: string;
  hasEvidence: boolean;
  observationCount: number;
  beliefScore: number;
  beliefPassed: boolean;
  linkOffline: boolean;
  reducedMotion: boolean;
}

function payloadInsight(sceneKind: PayloadViewProps["sceneKind"], beliefPassed: boolean) {
  const insights = {
    spectral: ["2.21 μm 判别特征", "候选区域与背景光谱出现可区分差异"],
    wildfire: ["热边界连续扩张", "新观测确认火线正在越过控制区域"],
    search: ["候选目标交叉一致", "雷达回波与遇险信标指向同一区域"]
  } as const;
  const [title, detail] = insights[sceneKind];
  return {
    title: beliefPassed ? title : `候选：${title}`,
    detail: beliefPassed ? detail : `${detail}，但当前仍不足以完成任务`
  };
}

export function PayloadView(props: PayloadViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useMemo(() => payloadState(
    props.eventType,
    props.actionType,
    props.hasEvidence,
    props.beliefPassed,
    props.linkOffline,
    props.observationCount
  ), [props.eventType, props.actionType, props.hasEvidence, props.beliefPassed, props.linkOffline, props.observationCount]);
  const insight = payloadInsight(props.sceneKind, props.beliefPassed);
  const focalX = 42 + (((props.position.longitude + 180) % 36) / 36) * 16;

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
      if (state.compareFrames) {
        context.strokeStyle = "rgba(255,255,255,.58)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(width / 2, height * 0.16);
        context.lineTo(width / 2, height * 0.84);
        context.stroke();
      }
      context.strokeStyle = `${props.accent}99`;
      context.lineWidth = 1;
      context.strokeRect(width * 0.18, height * 0.2, width * 0.64, height * 0.58);
      context.beginPath();
      context.moveTo(width / 2 - 13, height / 2);
      context.lineTo(width / 2 + 13, height / 2);
      context.moveTo(width / 2, height / 2 - 13);
      context.lineTo(width / 2, height / 2 + 13);
      context.stroke();
      if (state.showEvidence) {
        context.strokeStyle = props.accent;
        context.lineWidth = 1.5;
        context.strokeRect(width * 0.55, height * 0.39, width * 0.17, height * 0.2);
      }
      if (state.scanning) {
        const fraction = props.reducedMotion ? 0.5 : ((props.position.physicalTimeS % 9) + 9) % 9 / 9;
        const scanY = height * (0.2 + fraction * 0.58);
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
  }, [props.position, props.accent, props.reducedMotion, state]);

  return (
    <aside
      className={`payload-stack ${state.phase} ${state.linkOffline ? "link-offline" : ""}`}
      aria-label={`载荷视角：${state.label}。卫星位于纬度 ${props.position.latitude.toFixed(1)} 度，经度 ${props.position.longitude.toFixed(1)} 度。${state.detail}`}
    >
      <div className="payload-view">
        <div className={`payload-imagery ${state.compareFrames ? "compare" : ""}`} aria-hidden="true">
          <img src={props.imageSrc} alt="" style={{ objectPosition: `${focalX}% 50%` }} />
          {state.compareFrames && <img className="revisit" src={props.imageSrc} alt="" style={{ objectPosition: `${Math.min(72, focalX + 8)}% 50%` }} />}
        </div>
        <canvas ref={canvasRef} aria-hidden="true" />
        <div className="payload-topline">
          <div><span>载荷视角</span><b>PAYLOAD / NADIR</b></div>
          <i>POC CONTEXT IMAGE</i>
        </div>
        <div className="payload-coordinates">
          <span>LAT {props.position.latitude >= 0 ? "+" : ""}{props.position.latitude.toFixed(2)}°</span>
          <span>LON {props.position.longitude >= 0 ? "+" : ""}{props.position.longitude.toFixed(2)}°</span>
          <span>ALT {(props.position.altitudeM / 1000).toFixed(0)} KM</span>
        </div>
        {state.compareFrames && (
          <div className="payload-compare-labels" aria-hidden="true">
            <span><b>首次观测</b><small>证据不足</small></span>
            <span><b>重访观测</b><small>特征增强</small></span>
          </div>
        )}
        <a className="payload-image-credit" href={props.imageSource} target="_blank" rel="noreferrer" tabIndex={-1}>
          {props.imageLabel} · {props.imageCredit}
        </a>
      </div>
      <section className="payload-analysis" aria-label="载荷观测分析状态">
        <div className="payload-readout">
          <div><i /> <b>{state.label}</b></div>
          <span>{state.detail}</span>
        </div>
        {state.showEvidence ? (
          <div className="payload-evidence-insight">
            <span>观察值 / OBSERVED</span>
            <b>{insight.title}</b>
            <p>{insight.detail}</p>
            <small>推断 / DERIVED · 画面已冻结</small>
          </div>
        ) : (
          <div className="payload-evidence-idle"><span>图像作用 / CONTEXT</span><p>真实遥感影像提供场景语义；决策仍由 Runtime Trace 驱动。</p></div>
        )}
        <div className="payload-belief"><span>BELIEF</span><i><em style={{ width: `${Math.max(2, props.beliefScore * 100)}%` }} /></i><b>{Math.round(props.beliefScore * 100)}%</b></div>
      </section>
    </aside>
  );
}
