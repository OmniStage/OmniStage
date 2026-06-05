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
        <div style={softGlowStyle} />
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

/**
 * Ajuste principal:
 * - antes estava grande demais e invadia fora da arte do convite
 * - agora fica menor, centralizado e respeita o card do convite
 * - a animação não tenta preencher a tela toda
 */
const stageStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  width: "min(58%, 300px, calc(58vh * 9 / 16))",
  maxWidth: "58%",
  maxHeight: "58%",
  aspectRatio: "9 / 16",
  borderRadius: "20px",
  overflow: "hidden",
  transformOrigin: "center",
  transform: "translate3d(0, -1%, 0)",
  background: "transparent",
  boxShadow:
    "0 14px 38px rgba(2,6,23,.22), 0 0 16px rgba(255,223,0,.18)",
  animation:
    "omniCopaVideoEnter .38s cubic-bezier(.16,1,.3,1) both, omniCopaVideoFloat 3.8s ease-in-out .8s infinite",
};

const videoStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center center",
  display: "block",
  borderRadius: "20px",
};

const borderStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "20px",
  border: "1.25px solid rgba(255,223,0,.72)",
  boxShadow:
    "inset 0 0 9px rgba(255,223,0,.2), 0 0 14px rgba(255,223,0,.28)",
};

const softGlowStyle: CSSProperties = {
  position: "absolute",
  inset: "-1px",
  borderRadius: "20px",
  boxShadow:
    "0 0 22px rgba(255,223,0,.18), 0 0 34px rgba(255,122,0,.1)",
  opacity: 0.62,
  animation: "omniCopaVideoGlow 2.2s ease-in-out infinite",
};

const shineStyle: CSSProperties = {
  position: "absolute",
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
  0% { opacity: 0; transform: translate3d(0, 10px, 0) scale(.97); filter: blur(4px); }
  72% { opacity: 1; transform: translate3d(0, -2px, 0) scale(1.004); filter: blur(0); }
  100% { opacity: 1; transform: translate3d(0, -1%, 0) scale(1); filter: blur(0); }
}
@keyframes omniCopaVideoFloat {
  0%, 100% { transform: translate3d(0, -1%, 0) scale(1); }
  50% { transform: translate3d(0, calc(-1% - 3px), 0) scale(1.003); }
}
@keyframes omniCopaVideoGlow {
  0%, 100% { opacity: .46; }
  50% { opacity: .74; }
}
@keyframes omniCopaVideoShine {
  0%, 44% { transform: translateX(0) skewX(-14deg); opacity: 0; }
  56% { opacity: .46; }
  84%, 100% { transform: translateX(480%) skewX(-14deg); opacity: 0; }
}
`;

