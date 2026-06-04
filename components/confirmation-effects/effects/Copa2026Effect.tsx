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

      <div style={sceneGlowStyle} />

      <div style={confettiLayerStyle}>
        {Array.from({ length: 32 }).map((_, index) => {
          const colors = ["#ffdf00", "#ffffff", "#009c3b", "#002776", "#ff7a00"];
          const color = colors[index % colors.length];
          const size = 5 + (index % 4) * 2;

          return (
            <span
              key={index}
              style={{
                position: "absolute",
                left: `${(index * 31) % 100}%`,
                top: -30,
                width: size,
                height: index % 3 === 0 ? size : Math.max(4, size - 1),
                borderRadius: index % 3 === 0 ? 999 : 2,
                background: color,
                opacity: 0.78,
                boxShadow: "0 8px 18px rgba(0,0,0,.26)",
                animation: `omniCopaCardConfetti ${3.6 + (index % 7) * 0.28}s linear ${(index % 11) * 0.11}s infinite`,
                ["--x" as any]: `${((index % 9) - 4) * 24}px`,
                ["--r" as any]: `${180 + (index % 8) * 55}deg`,
              }}
            />
          );
        })}
      </div>

      <div style={cardWrapStyle}>
        <div style={cardGlowStyle} />
        <div style={cardStyle}>
          <div style={cardImageStyle} />
          <div style={cardShadeStyle} />
          <div style={borderLightStyle} />
          <div style={edgeSweepStyle} />
          <div style={titleSweepStyle} />
        </div>

        <div style={ballWrapStyle}>
          <div style={ballTrailStyle} />
          <div style={ballAuraStyle} />
          <div style={ballSpriteStyle} />
        </div>

        <div style={impactFlashStyle} />
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
  display: "grid",
  placeItems: "center",
  padding: "clamp(14px, 4vw, 34px)",
  boxSizing: "border-box",
  background:
    "radial-gradient(circle at 50% 54%, rgba(255,223,0,.16), transparent 38%), linear-gradient(180deg, rgba(2,6,23,.52), rgba(2,6,23,.78))",
};

const sceneGlowStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at 66% 18%, rgba(255,223,0,.26), transparent 30%), radial-gradient(circle at 28% 80%, rgba(0,156,59,.18), transparent 34%), radial-gradient(circle at 76% 74%, rgba(0,39,118,.24), transparent 38%)",
  animation: "omniCopaScenePulse 3.2s ease-in-out infinite",
};

const confettiLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  overflow: "hidden",
};

const cardWrapStyle: CSSProperties = {
  position: "relative",
  zIndex: 4,
  width: "min(82vw, 560px)",
  aspectRatio: "3 / 4",
  transformStyle: "preserve-3d",
  perspective: 1400,
  animation:
    "omniCopaCardEnter .82s cubic-bezier(.16,1,.3,1) both, omniCopaCardFloat 4.2s ease-in-out 1s infinite",
};

const cardGlowStyle: CSSProperties = {
  position: "absolute",
  inset: "-3%",
  borderRadius: "clamp(28px, 5vw, 46px)",
  background:
    "radial-gradient(circle at 74% 12%, rgba(255,223,0,.55), transparent 28%), radial-gradient(circle at 50% 96%, rgba(255,223,0,.38), transparent 34%)",
  filter: "blur(24px)",
  opacity: 0.9,
  animation: "omniCopaCardGlow 2.4s ease-in-out infinite",
};

const cardStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "clamp(24px, 4.6vw, 40px)",
  overflow: "hidden",
  transform: "rotateX(0deg) rotateY(0deg)",
  background: "#060913",
  boxShadow:
    "0 32px 90px rgba(0,0,0,.54), 0 0 0 1px rgba(255,255,255,.18), 0 0 52px rgba(255,223,0,.35)",
};

const cardImageStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: "url('/effects/copa2026-card-premium.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  transform: "scale(1.01)",
  animation: "omniCopaCardImageBreath 4.8s ease-in-out infinite",
};

const cardShadeStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(255,255,255,.04), transparent 36%, rgba(2,6,23,.08)), radial-gradient(circle at 72% 14%, rgba(255,223,0,.2), transparent 28%)",
};

const borderLightStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "inherit",
  border: "2px solid rgba(255,218,72,.9)",
  boxShadow:
    "inset 0 0 18px rgba(255,223,0,.45), 0 0 24px rgba(255,223,0,.7), 0 0 58px rgba(255,157,0,.36)",
  animation: "omniCopaBorderPulse 1.85s ease-in-out infinite",
};

const edgeSweepStyle: CSSProperties = {
  position: "absolute",
  inset: "-2px",
  borderRadius: "inherit",
  background:
    "conic-gradient(from 0deg, transparent 0deg, transparent 48deg, rgba(255,255,255,.95) 58deg, rgba(255,223,0,.95) 68deg, transparent 82deg, transparent 360deg)",
  WebkitMask:
    "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  maskComposite: "exclude",
  padding: 3,
  opacity: 0.95,
  animation: "omniCopaEdgeSweep 2.4s linear infinite",
};

const titleSweepStyle: CSSProperties = {
  position: "absolute",
  left: "7%",
  right: "7%",
  bottom: "15%",
  height: "25%",
  background:
    "linear-gradient(105deg, transparent 0%, transparent 28%, rgba(255,255,255,.24) 43%, rgba(255,223,0,.3) 50%, transparent 68%, transparent 100%)",
  transform: "translateX(-120%) skewX(-12deg)",
  filter: "blur(.3px)",
  animation: "omniCopaTextSweep 2.8s ease-in-out 1s infinite",
};

const ballWrapStyle: CSSProperties = {
  position: "absolute",
  top: "5.6%",
  right: "-8.2%",
  width: "32%",
  aspectRatio: "1",
  zIndex: 7,
  transformStyle: "preserve-3d",
  animation:
    "omniCopaBallOutAndBack 2.55s cubic-bezier(.16,1,.3,1) .16s both, omniCopaBallIdle 3.4s ease-in-out 2.8s infinite",
};

const ballTrailStyle: CSSProperties = {
  position: "absolute",
  right: "48%",
  top: "50%",
  width: "140%",
  height: "36%",
  transform: "translateY(-50%) rotate(-18deg)",
  transformOrigin: "right center",
  borderRadius: 999,
  background:
    "linear-gradient(90deg, transparent, rgba(255,122,0,.16), rgba(255,223,0,.65), rgba(255,255,255,.9))",
  filter: "blur(4px)",
  opacity: 0,
  animation: "omniCopaBallTrail 2.55s ease-in-out .16s both",
};

const ballAuraStyle: CSSProperties = {
  position: "absolute",
  inset: "-20%",
  borderRadius: 999,
  background:
    "conic-gradient(from 0deg, rgba(255,223,0,.08), rgba(255,223,0,.95), rgba(255,122,0,.76), rgba(255,255,255,.92), rgba(255,223,0,.08))",
  WebkitMask:
    "radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px))",
  mask:
    "radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px))",
  filter: "drop-shadow(0 0 12px rgba(255,223,0,.88))",
  animation: "omniCopaBallAura 1.1s linear infinite",
};

const ballSpriteStyle: CSSProperties = {
  position: "absolute",
  inset: "10%",
  borderRadius: 999,
  backgroundImage: "url('/effects/copa2026-card-premium.png')",
  backgroundSize: "620%",
  backgroundPosition: "89% 8%",
  backgroundRepeat: "no-repeat",
  border: "3px solid rgba(255,255,255,.92)",
  boxShadow:
    "0 24px 52px rgba(0,0,0,.5), 0 0 0 9px rgba(255,223,0,.18), 0 0 42px rgba(255,223,0,.75)",
  animation: "omniCopaBallSpin 1.05s linear infinite",
};

const impactFlashStyle: CSSProperties = {
  position: "absolute",
  top: "9%",
  right: "-2%",
  width: "26%",
  aspectRatio: "1",
  borderRadius: 999,
  zIndex: 6,
  background:
    "radial-gradient(circle, rgba(255,255,255,.92), rgba(255,223,0,.72) 18%, rgba(255,122,0,.2) 46%, transparent 72%)",
  filter: "blur(1px)",
  opacity: 0,
  animation: "omniCopaImpactFlash 2.55s ease-in-out .16s both",
};

const confirmingPillStyle: CSSProperties = {
  position: "absolute",
  zIndex: 10,
  left: "50%",
  bottom: "clamp(16px, 4vw, 28px)",
  transform: "translateX(-50%)",
  padding: "10px 14px",
  borderRadius: 999,
  background: "rgba(2,6,23,.62)",
  border: "1px solid rgba(255,255,255,.26)",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 850,
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

const keyframesCss = `
@keyframes omniCopaScenePulse {
  0%, 100% { opacity: .78; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.02); }
}
@keyframes omniCopaCardEnter {
  0% { opacity: 0; transform: translateY(32px) scale(.94) rotateX(7deg); filter: blur(8px); }
  70% { opacity: 1; transform: translateY(-4px) scale(1.012) rotateX(0deg); filter: blur(0); }
  100% { opacity: 1; transform: translateY(0) scale(1) rotateX(0deg); filter: blur(0); }
}
@keyframes omniCopaCardFloat {
  0%, 100% { transform: translateY(0) rotateX(0deg) rotateY(0deg); }
  50% { transform: translateY(-8px) rotateX(1.1deg) rotateY(-1deg); }
}
@keyframes omniCopaCardGlow {
  0%, 100% { opacity: .72; transform: scale(.98); }
  50% { opacity: 1; transform: scale(1.04); }
}
@keyframes omniCopaCardImageBreath {
  0%, 100% { transform: scale(1.01); filter: saturate(1.02) contrast(1.02); }
  50% { transform: scale(1.026); filter: saturate(1.08) contrast(1.04); }
}
@keyframes omniCopaBorderPulse {
  0%, 100% { box-shadow: inset 0 0 18px rgba(255,223,0,.45), 0 0 24px rgba(255,223,0,.7), 0 0 58px rgba(255,157,0,.36); }
  50% { box-shadow: inset 0 0 26px rgba(255,255,255,.34), 0 0 34px rgba(255,223,0,.95), 0 0 74px rgba(255,157,0,.5); }
}
@keyframes omniCopaEdgeSweep {
  0% { transform: rotate(0deg); opacity: .86; }
  50% { opacity: 1; }
  100% { transform: rotate(360deg); opacity: .86; }
}
@keyframes omniCopaTextSweep {
  0%, 28% { transform: translateX(-120%) skewX(-12deg); opacity: 0; }
  42% { opacity: 1; }
  70%, 100% { transform: translateX(120%) skewX(-12deg); opacity: 0; }
}
@keyframes omniCopaBallOutAndBack {
  0% { opacity: 0; transform: translate3d(-12%, 10%, 0) scale(.86) rotate(-80deg); filter: blur(4px); }
  18% { opacity: 1; filter: blur(0); }
  42% { transform: translate3d(22%, -18%, 90px) scale(1.18) rotate(160deg); }
  68% { transform: translate3d(5%, -5%, 40px) scale(1.06) rotate(285deg); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(360deg); filter: blur(0); }
}
@keyframes omniCopaBallIdle {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(0, -8px, 0) scale(1.035); }
}
@keyframes omniCopaBallTrail {
  0%, 100% { opacity: 0; transform: translateY(-50%) rotate(-18deg) scaleX(.7); }
  18%, 62% { opacity: .95; transform: translateY(-50%) rotate(-18deg) scaleX(1.12); }
  78% { opacity: .38; transform: translateY(-50%) rotate(-18deg) scaleX(.9); }
}
@keyframes omniCopaBallAura {
  0% { transform: rotate(0deg) scale(1); opacity: .88; }
  50% { transform: rotate(180deg) scale(1.045); opacity: 1; }
  100% { transform: rotate(360deg) scale(1); opacity: .88; }
}
@keyframes omniCopaBallSpin {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.025); }
  100% { transform: rotate(360deg) scale(1); }
}
@keyframes omniCopaImpactFlash {
  0%, 18% { opacity: 0; transform: scale(.3); }
  34% { opacity: .95; transform: scale(1.12); }
  52% { opacity: .36; transform: scale(1.5); }
  78%, 100% { opacity: 0; transform: scale(1.9); }
}
@keyframes omniCopaCardConfetti {
  0% { opacity: 0; transform: translate3d(0,-28px,0) rotate(0deg); }
  10% { opacity: .78; }
  86% { opacity: .72; }
  100% { opacity: 0; transform: translate3d(var(--x), 780px, 0) rotate(var(--r)); }
}
`;

