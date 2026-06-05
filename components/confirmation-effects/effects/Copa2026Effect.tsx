"use client";

import type { CSSProperties } from "react";
import type { ConfirmationEffectProps } from "../types";

export default function Copa2026Effect({
  open,
  confirming = false,
  contained = true,
}: ConfirmationEffectProps) {
  if (!open) return null;

  return (
    <div
      style={{
        ...overlayStyle,
        position: contained ? "absolute" : "fixed",
      }}
      aria-hidden="true"
    >
      <style>{keyframesCss}</style>

      <div style={stageStyle}>
        <div style={goldBackgroundStyle} />

        <video
          src="/effects/copa2026-card-animation.mp4"
          autoPlay
          muted
          playsInline
          loop={false}
          preload="auto"
          style={videoStyle}
        />

        <div style={borderStyle} />
        <div style={shineStyle} />
      </div>

      {confirming ? (
        <div style={confirmingPillStyle}>Confirmando presença...</div>
      ) : null}
    </div>
  );
}

const overlayStyle: CSSProperties = {
  inset: 0,
  zIndex: 80,
  pointerEvents: "none",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  boxSizing: "border-box",
  background: "transparent",
};

const stageStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  width: "min(72%, 360px, calc(74vh * 832 / 1104))",
  aspectRatio: "832 / 1104",
  borderRadius: "22px",
  overflow: "hidden",
  transformOrigin: "center",
  transform: "translate3d(0, -2%, 0)",
  background: "transparent",
  boxShadow: "0 18px 46px rgba(2,6,23,.26)",
  animation:
    "omniCopaVideoEnter .42s cubic-bezier(.16,1,.3,1) both, omniCopaVideoFloat 3.8s ease-in-out .8s infinite",
};

/**
 * O card dourado de fundo usa exatamente o mesmo tamanho do vídeo:
 * inset 0, mesma borda, mesmo borderRadius e mesmo overflow do stage.
 * Não existe mais camada dourada maior ou menor atrás do vídeo.
 */
const goldBackgroundStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 0,
  borderRadius: "22px",
  background:
    "linear-gradient(180deg, rgba(255,223,0,.06), rgba(255,183,0,.035))",
  boxShadow:
    "inset 0 0 10px rgba(255,223,0,.10), 0 0 12px rgba(255,223,0,.14)",
  animation: "omniCopaGoldPulse 2.2s ease-in-out infinite",
};

const videoStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center center",
  display: "block",
  borderRadius: "22px",
};

const borderStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  borderRadius: "22px",
  border: "1.25px solid rgba(255,223,0,.72)",
  boxShadow:
    "inset 0 0 10px rgba(255,223,0,.22), 0 0 16px rgba(255,223,0,.3)",
};

const shineStyle: CSSProperties = {
  position: "absolute",
  zIndex: 3,
  top: 0,
  bottom: 0,
  left: "-52%",
  width: "30%",
  transform: "skewX(-14deg)",
  background:
    "linear-gradient(90deg, transparent, rgba(255,255,255,.1), rgba(255,223,0,.1), transparent)",
  animation: "omniCopaVideoShine 3.4s ease-in-out 1.1s infinite",
};

const confirmingPillStyle: CSSProperties = {
  position: "absolute",
  zIndex: 5,
  left: "50%",
  bottom: "18px",
  transform: "translateX(-50%)",
  padding: "10px 14px",
  borderRadius: 999,
  background: "rgba(2,6,23,.66)",
  border: "1px solid rgba(255,255,255,.22)",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 850,
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

const keyframesCss = `
@keyframes omniCopaVideoEnter {
  0% { opacity: 0; transform: translate3d(0, 12px, 0) scale(.97); filter: blur(4px); }
  72% { opacity: 1; transform: translate3d(0, -2%, 0) scale(1.004); filter: blur(0); }
  100% { opacity: 1; transform: translate3d(0, -2%, 0) scale(1); filter: blur(0); }
}
@keyframes omniCopaVideoFloat {
  0%, 100% { transform: translate3d(0, -2%, 0) scale(1); }
  50% { transform: translate3d(0, calc(-2% - 4px), 0) scale(1.003); }
}
@keyframes omniCopaGoldPulse {
  0%, 100% { opacity: .82; }
  50% { opacity: 1; }
}
@keyframes omniCopaVideoShine {
  0%, 44% { transform: translateX(0) skewX(-14deg); opacity: 0; }
  56% { opacity: .46; }
  84%, 100% { transform: translateX(480%) skewX(-14deg); opacity: 0; }
}
`;
