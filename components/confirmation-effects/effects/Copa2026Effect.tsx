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

      <div style={videoFrameStyle}>
        <video
          src="/effects/copa2026-card-animation.mp4"
          autoPlay
          muted
          playsInline
          loop={false}
          preload="auto"
          style={videoStyle}
        />

        <div style={blendTopStyle} />
        <div style={blendBottomStyle} />
        <div style={frameLineStyle} />
        <div style={shineStyle} />
      </div>

      {false && confirming ? (
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
  background: "rgba(2, 6, 23, .48)",
  backdropFilter: "blur(8px) saturate(.86)",
  WebkitBackdropFilter: "blur(8px) saturate(.86)",
};

const videoFrameStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  width: "min(76%, 380px, calc(76vh * 832 / 1104))",
  aspectRatio: "832 / 1104",
  borderRadius: "26px",
  overflow: "hidden",
  transformOrigin: "center",
  transform: "translate3d(0, -2%, 0)",
  background: "rgba(6, 10, 18, .72)",
  border: "1px solid rgba(255, 223, 0, .22)",
  boxShadow:
    "0 28px 90px rgba(0,0,0,.58), 0 0 0 1px rgba(255,255,255,.10), 0 0 42px rgba(255,223,0,.18)",
  animation:
    "omniCopaVideoEnter .36s cubic-bezier(.16,1,.3,1) both, omniCopaVideoFloat 3.8s ease-in-out .8s infinite",
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
  borderRadius: "26px",
};

const blendTopStyle: CSSProperties = {
  position: "absolute",
  zIndex: 2,
  left: 0,
  right: 0,
  top: 0,
  height: "14%",
  borderRadius: "26px 26px 0 0",
  background:
    "linear-gradient(180deg, rgba(255,223,0,.18), rgba(255,223,0,.06) 42%, transparent)",
  mixBlendMode: "screen",
  opacity: 0.42,
};

const blendBottomStyle: CSSProperties = {
  position: "absolute",
  zIndex: 2,
  left: 0,
  right: 0,
  bottom: 0,
  height: "12%",
  borderRadius: "0 0 26px 26px",
  background:
    "linear-gradient(0deg, rgba(255,223,0,.12), rgba(255,223,0,.04) 46%, transparent)",
  mixBlendMode: "screen",
  opacity: 0.34,
};

const frameLineStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 3,
  borderRadius: "26px",
  border: "1.25px solid rgba(255,223,0,.74)",
  boxShadow:
    "inset 0 0 10px rgba(255,223,0,.18), 0 0 14px rgba(255,223,0,.22)",
};

const shineStyle: CSSProperties = {
  position: "absolute",
  zIndex: 4,
  top: 0,
  bottom: 0,
  left: "-54%",
  width: "28%",
  transform: "skewX(-14deg)",
  background:
    "linear-gradient(90deg, transparent, rgba(255,255,255,.10), rgba(255,223,0,.10), transparent)",
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
  100% { opacity: 1; transform: translate3d(0, -2%, 0) scale(1); filter: blur(0); }
}
@keyframes omniCopaVideoFloat {
  0%, 100% { transform: translate3d(0, -2%, 0) scale(1); }
  50% { transform: translate3d(0, calc(-2% - 3px), 0) scale(1.003); }
}
@keyframes omniCopaVideoShine {
  0%, 44% { transform: translateX(0) skewX(-14deg); opacity: 0; }
  56% { opacity: .42; }
  84%, 100% { transform: translateX(500%) skewX(-14deg); opacity: 0; }
}
`;

