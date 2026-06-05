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

const stageStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,

  /*
   * Medida pensada para ficar como na referência:
   * - centralizado dentro do convite
   * - sem ocupar a tela inteira
   * - proporcional ao vídeo vertical 9:16
   */
  width: "min(72%, 360px)",
  maxWidth: "72%",
  maxHeight: "76%",
  aspectRatio: "9 / 16",

  borderRadius: "24px",
  overflow: "hidden",
  transformOrigin: "center",
  transform: "translateY(-2%)",
  background: "transparent",
  boxShadow:
    "0 18px 46px rgba(2,6,23,.28), 0 0 18px rgba(255,223,0,.18)",
  animation:
    "omniCopaVideoEnter .42s cubic-bezier(.16,1,.3,1) both, omniCopaVideoFloat 3.8s ease-in-out .8s infinite",
};

const videoStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center",
  display: "block",
  borderRadius: "24px",
};

const borderStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "24px",
  border: "1.5px solid rgba(255,223,0,.78)",
  boxShadow:
    "inset 0 0 10px rgba(255,223,0,.22), 0 0 16px rgba(255,223,0,.3)",
};

const softGlowStyle: CSSProperties = {
  position: "absolute",
  inset: "-1px",
  borderRadius: "24px",
  boxShadow:
    "0 0 28px rgba(255,223,0,.2), 0 0 46px rgba(255,122,0,.12)",
  opacity: 0.72,
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
    "linear-gradient(90deg, transparent, rgba(255,255,255,.12), rgba(255,223,0,.12), transparent)",
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
  0% { opacity: 0; transform: translateY(14px) scale(.96); filter: blur(4px); }
  72% { opacity: 1; transform: translateY(-2px) scale(1.006); filter: blur(0); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
@keyframes omniCopaVideoFloat {
  0%, 100% { transform: translateY(-2%) scale(1); }
  50% { transform: translateY(calc(-2% - 4px)) scale(1.004); }
}
@keyframes omniCopaVideoGlow {
  0%, 100% { opacity: .58; }
  50% { opacity: .88; }
}
@keyframes omniCopaVideoShine {
  0%, 44% { transform: translateX(0) skewX(-14deg); opacity: 0; }
  56% { opacity: .58; }
  84%, 100% { transform: translateX(480%) skewX(-14deg); opacity: 0; }
}
`;

