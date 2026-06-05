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

      <div style={ambientGlowStyle} />

      <div style={videoWrapStyle}>
        <div style={goldGlowStyle} />

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
  padding: "18px",
  boxSizing: "border-box",
  background:
    "radial-gradient(circle at 50% 50%, rgba(255,223,0,.12), transparent 42%), rgba(2,6,23,.18)",
};

const ambientGlowStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at 50% 58%, rgba(255,223,0,.16), transparent 38%), radial-gradient(circle at 75% 18%, rgba(255,122,0,.16), transparent 28%)",
  animation: "omniCopaVideoAmbient 2.4s ease-in-out infinite",
};

const videoWrapStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  width: "min(72vw, 360px, calc(70vh * 9 / 16))",
  aspectRatio: "9 / 16",
  borderRadius: "24px",
  overflow: "hidden",
  transformOrigin: "center",
  animation:
    "omniCopaVideoEnter .54s cubic-bezier(.16,1,.3,1) both, omniCopaVideoFloat 3.6s ease-in-out .8s infinite",
};

const goldGlowStyle: CSSProperties = {
  position: "absolute",
  inset: "-4%",
  borderRadius: "28px",
  background:
    "radial-gradient(circle at 75% 8%, rgba(255,223,0,.58), transparent 30%), radial-gradient(circle at 50% 96%, rgba(255,223,0,.36), transparent 34%)",
  filter: "blur(18px)",
  opacity: 0.92,
  animation: "omniCopaVideoGlow 1.8s ease-in-out infinite",
};

const videoStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
  borderRadius: "24px",
};

const borderStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "24px",
  border: "2px solid rgba(255,223,0,.82)",
  boxShadow:
    "inset 0 0 18px rgba(255,223,0,.34), 0 0 28px rgba(255,223,0,.5)",
};

const shineStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: "-45%",
  width: "32%",
  transform: "skewX(-14deg)",
  background:
    "linear-gradient(90deg, transparent, rgba(255,255,255,.18), rgba(255,223,0,.2), transparent)",
  animation: "omniCopaVideoShine 2.8s ease-in-out .8s infinite",
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
  0% { opacity: 0; transform: translateY(22px) scale(.94); filter: blur(6px); }
  70% { opacity: 1; transform: translateY(-3px) scale(1.012); filter: blur(0); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
@keyframes omniCopaVideoFloat {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-5px) scale(1.006); }
}
@keyframes omniCopaVideoGlow {
  0%, 100% { opacity: .68; transform: scale(.98); }
  50% { opacity: 1; transform: scale(1.04); }
}
@keyframes omniCopaVideoShine {
  0%, 35% { transform: translateX(0) skewX(-14deg); opacity: 0; }
  48% { opacity: .9; }
  78%, 100% { transform: translateX(430%) skewX(-14deg); opacity: 0; }
}
@keyframes omniCopaVideoAmbient {
  0%, 100% { opacity: .72; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.025); }
}
`;

