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

      <div style={backgroundImageStyle} />
      <div style={cinematicShadeStyle} />
      <div style={lightSweepStyle} />
      <div style={stadiumGlowStyle} />

      <div style={confettiLayerStyle}>
        {Array.from({ length: 34 }).map((_, index) => {
          const colors = ["#009c3b", "#ffdf00", "#002776", "#ffffff", "#ff7a00"];
          const color = colors[index % colors.length];
          const size = 5 + (index % 4) * 2;

          return (
            <span
              key={index}
              style={{
                position: "absolute",
                left: `${(index * 29) % 100}%`,
                top: -28,
                width: size,
                height: index % 3 === 0 ? size : Math.max(4, size - 1),
                borderRadius: index % 3 === 0 ? 999 : 2,
                background: color,
                opacity: 0.82,
                boxShadow: "0 8px 18px rgba(0,0,0,.2)",
                animation: `omniCopaPremiumConfetti ${3.2 + (index % 6) * 0.34}s linear ${(index % 10) * 0.12}s infinite`,
                ["--x" as any]: `${((index % 9) - 4) * 22}px`,
                ["--r" as any]: `${180 + (index % 7) * 70}deg`,
              }}
            />
          );
        })}

        {Array.from({ length: 14 }).map((_, index) => (
          <span
            key={`spark-${index}`}
            style={{
              position: "absolute",
              left: `${8 + ((index * 17) % 84)}%`,
              top: `${10 + ((index * 23) % 76)}%`,
              width: 3 + (index % 3),
              height: 3 + (index % 3),
              borderRadius: 999,
              background: index % 2 === 0 ? "#ffdf00" : "#ffffff",
              boxShadow:
                index % 2 === 0
                  ? "0 0 18px rgba(255,223,0,.92)"
                  : "0 0 16px rgba(255,255,255,.86)",
              animation: `omniCopaPremiumSpark ${1.8 + (index % 5) * 0.24}s ease-in-out ${index * 0.09}s infinite`,
            }}
          />
        ))}
      </div>

      <div style={ballStageStyle}>
        <div style={energyTrailStyle} />
        <div style={orbitOuterStyle} />
        <div style={orbitInnerStyle} />
        <div style={ballImageStyle} />
      </div>

      <div style={goalCardStyle}>
        <div style={goalCardShineStyle} />
        <div style={goalEyebrowStyle}>
          <span style={liveDotStyle} />
          WORLD CUP 2026
        </div>

        <strong style={goalTitleStyle}>
          {confirming ? "CONFIRMANDO" : "GOOOOOOOL!"}
        </strong>

        <span style={goalTextStyle}>
          {confirming
            ? "Estamos registrando sua confirmação."
            : "Sua presença está confirmada. Você foi convocado para essa festa!"}
        </span>

        {!confirming ? (
          <div style={statusRowStyle}>
            <span style={statusPillStyle}>Presença confirmada</span>
            <span style={statusDividerStyle} />
            <span style={statusPillStyle}>Convocado</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  inset: 0,
  zIndex: 80,
  display: "block",
  pointerEvents: "none",
  overflow: "hidden",
  background: "rgba(2,6,23,.08)",
};

const backgroundImageStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: "url('/effects/copa2026-confirmacao.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  transform: "scale(1.008)",
  filter: "saturate(1.06) contrast(1.03)",
  animation: "omniCopaPremiumBg 6s ease-in-out infinite",
};

const cinematicShadeStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  background:
    "linear-gradient(180deg, rgba(2,6,23,.18) 0%, rgba(2,6,23,.02) 35%, rgba(2,6,23,.22) 100%), radial-gradient(circle at 50% 62%, rgba(255,223,0,.16), transparent 42%)",
};

const lightSweepStyle: CSSProperties = {
  position: "absolute",
  zIndex: 2,
  top: "-20%",
  left: "-45%",
  width: "38%",
  height: "145%",
  transform: "rotate(18deg)",
  background:
    "linear-gradient(90deg, transparent, rgba(255,255,255,.16), rgba(255,223,0,.16), transparent)",
  filter: "blur(1px)",
  animation: "omniCopaPremiumSweep 3.8s ease-in-out .45s infinite",
};

const stadiumGlowStyle: CSSProperties = {
  position: "absolute",
  zIndex: 2,
  left: "50%",
  bottom: "-9%",
  width: "86%",
  height: "28%",
  transform: "translateX(-50%)",
  borderRadius: "999px 999px 0 0",
  background:
    "radial-gradient(ellipse at center, rgba(255,223,0,.45), rgba(0,156,59,.2) 42%, transparent 72%)",
  filter: "blur(18px)",
  opacity: 0.9,
  animation: "omniCopaPremiumStadium 1.9s ease-in-out infinite",
};

const confettiLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 3,
  overflow: "hidden",
  pointerEvents: "none",
};

const ballStageStyle: CSSProperties = {
  position: "absolute",
  zIndex: 8,
  top: "7.6%",
  right: "8.2%",
  width: "clamp(108px, 24vw, 178px)",
  aspectRatio: "1",
  display: "grid",
  placeItems: "center",
  transformOrigin: "center",
  animation:
    "omniCopaPremiumBallEnter .82s cubic-bezier(.16,1,.3,1) both, omniCopaPremiumBallFloat 2.2s ease-in-out 1s infinite",
};

const energyTrailStyle: CSSProperties = {
  position: "absolute",
  right: "58%",
  top: "47%",
  width: "clamp(120px, 28vw, 260px)",
  height: "clamp(28px, 6vw, 56px)",
  transform: "translateY(-50%) rotate(-12deg)",
  transformOrigin: "right center",
  borderRadius: 999,
  background:
    "linear-gradient(90deg, transparent, rgba(255,122,0,.18), rgba(255,223,0,.62), rgba(255,255,255,.84))",
  filter: "blur(4px)",
  opacity: 0.9,
  animation: "omniCopaPremiumTrail 1.8s ease-in-out infinite",
};

const orbitOuterStyle: CSSProperties = {
  position: "absolute",
  inset: "-10%",
  borderRadius: 999,
  border: "2px solid rgba(255,255,255,.72)",
  boxShadow:
    "0 0 18px rgba(255,255,255,.44), 0 0 42px rgba(255,223,0,.72), inset 0 0 24px rgba(255,223,0,.34)",
  animation: "omniCopaPremiumOrbit 1.85s linear infinite",
};

const orbitInnerStyle: CSSProperties = {
  position: "absolute",
  inset: "-21%",
  borderRadius: 999,
  background:
    "conic-gradient(from 0deg, rgba(255,223,0,.0), rgba(255,223,0,.95), rgba(255,122,0,.75), rgba(255,255,255,.85), rgba(255,223,0,.0))",
  WebkitMask:
    "radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px))",
  mask:
    "radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px))",
  filter: "drop-shadow(0 0 12px rgba(255,223,0,.9))",
  animation: "omniCopaPremiumOrbitReverse 1.15s linear infinite",
};

const ballImageStyle: CSSProperties = {
  position: "relative",
  width: "73%",
  height: "73%",
  borderRadius: 999,
  backgroundImage: "url('/effects/copa2026-confirmacao.png')",
  backgroundSize: "820%",
  backgroundPosition: "86% 13%",
  backgroundRepeat: "no-repeat",
  border: "4px solid rgba(255,255,255,.95)",
  boxShadow:
    "0 20px 44px rgba(0,0,0,.42), 0 0 0 10px rgba(255,223,0,.22), 0 0 44px rgba(255,223,0,.8)",
  overflow: "hidden",
  animation: "omniCopaPremiumBallSpin 1.35s linear infinite",
};

const goalCardStyle: CSSProperties = {
  position: "absolute",
  zIndex: 9,
  left: "50%",
  bottom: "10.8%",
  width: "min(78%, 720px)",
  minHeight: "clamp(132px, 18vh, 198px)",
  transform: "translateX(-50%)",
  padding: "clamp(18px, 3.6vw, 28px)",
  boxSizing: "border-box",
  borderRadius: "clamp(22px, 3.2vw, 34px)",
  border: "1px solid rgba(255,255,255,.72)",
  background:
    "linear-gradient(135deg, rgba(255,255,255,.22), rgba(255,255,255,.08)), linear-gradient(135deg, rgba(0,39,118,.42), rgba(0,156,59,.36))",
  backdropFilter: "blur(16px) saturate(1.45)",
  WebkitBackdropFilter: "blur(16px) saturate(1.45)",
  boxShadow:
    "0 28px 82px rgba(0,0,0,.36), 0 0 0 1px rgba(255,255,255,.28), 0 0 42px rgba(255,223,0,.38), inset 0 1px 0 rgba(255,255,255,.64)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  textAlign: "center",
  overflow: "hidden",
  animation:
    "omniCopaPremiumCardEnter .72s cubic-bezier(.16,1,.3,1) .22s both, omniCopaPremiumCardGlow 2.2s ease-in-out 1s infinite",
};

const goalCardShineStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(105deg, transparent 0%, rgba(255,255,255,.18) 42%, rgba(255,223,0,.18) 50%, transparent 62%)",
  transform: "translateX(-110%)",
  animation: "omniCopaPremiumCardShine 3s ease-in-out 1.1s infinite",
};

const goalEyebrowStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "6px 11px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.42)",
  background: "rgba(255,255,255,.12)",
  color: "rgba(255,255,255,.9)",
  fontSize: "clamp(10px, 2.2vw, 12px)",
  lineHeight: 1,
  fontWeight: 950,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  textShadow: "0 2px 10px rgba(0,0,0,.28)",
};

const liveDotStyle: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: 999,
  background: "#ffdf00",
  boxShadow: "0 0 14px rgba(255,223,0,.9)",
  animation: "omniCopaPremiumDot 1.15s ease-in-out infinite",
};

const goalTitleStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  color: "#ffffff",
  fontSize: "clamp(42px, 10.2vw, 78px)",
  lineHeight: 0.9,
  fontWeight: 950,
  letterSpacing: "-.06em",
  textTransform: "uppercase",
  textShadow:
    "0 3px 0 rgba(0,39,118,.88), 0 9px 22px rgba(0,0,0,.42), 0 0 22px rgba(255,255,255,.46)",
  WebkitTextStroke: "1px rgba(2,6,23,.26)",
  animation: "omniCopaPremiumTitleReveal .62s cubic-bezier(.16,1,.3,1) .38s both",
};

const goalTextStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: 570,
  color: "#ffffff",
  fontSize: "clamp(17px, 4vw, 26px)",
  lineHeight: 1.16,
  fontWeight: 900,
  textShadow: "0 3px 12px rgba(0,0,0,.54)",
  animation: "omniCopaPremiumTextReveal .62s cubic-bezier(.16,1,.3,1) .5s both",
};

const statusRowStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  marginTop: 4,
  opacity: 0.94,
  animation: "omniCopaPremiumTextReveal .62s cubic-bezier(.16,1,.3,1) .62s both",
};

const statusPillStyle: CSSProperties = {
  color: "rgba(255,255,255,.92)",
  fontSize: "clamp(10px, 2.4vw, 12px)",
  fontWeight: 850,
  letterSpacing: ".02em",
};

const statusDividerStyle: CSSProperties = {
  width: 4,
  height: 4,
  borderRadius: 999,
  background: "rgba(255,223,0,.9)",
  boxShadow: "0 0 12px rgba(255,223,0,.72)",
};

const keyframesCss = `
@keyframes omniCopaPremiumBg {
  0%, 100% { transform: scale(1.008); filter: saturate(1.06) contrast(1.03); }
  50% { transform: scale(1.018); filter: saturate(1.12) contrast(1.05); }
}
@keyframes omniCopaPremiumSweep {
  0%, 44% { transform: translateX(0) rotate(18deg); opacity: 0; }
  52% { opacity: .92; }
  72% { opacity: .45; }
  100% { transform: translateX(420%) rotate(18deg); opacity: 0; }
}
@keyframes omniCopaPremiumStadium {
  0%, 100% { opacity: .62; transform: translateX(-50%) scaleX(.96); }
  50% { opacity: .94; transform: translateX(-50%) scaleX(1.04); }
}
@keyframes omniCopaPremiumConfetti {
  0% { opacity: 0; transform: translate3d(0,-22px,0) rotate(0deg); }
  10% { opacity: .82; }
  84% { opacity: .78; }
  100% { opacity: 0; transform: translate3d(var(--x), 760px, 0) rotate(var(--r)); }
}
@keyframes omniCopaPremiumSpark {
  0%, 100% { opacity: .25; transform: scale(.72); }
  50% { opacity: 1; transform: scale(1.32); }
}
@keyframes omniCopaPremiumBallEnter {
  0% { opacity: 0; transform: translate3d(92px,-48px,0) scale(.48) rotate(-160deg); filter: blur(3px); }
  64% { opacity: 1; transform: translate3d(-8px,5px,0) scale(1.08) rotate(14deg); filter: blur(0); }
  100% { opacity: 1; transform: translate3d(0,0,0) scale(1) rotate(0deg); filter: blur(0); }
}
@keyframes omniCopaPremiumBallFloat {
  0%, 100% { margin-top: 0; }
  50% { margin-top: -7px; }
}
@keyframes omniCopaPremiumTrail {
  0%, 100% { opacity: .46; transform: translateY(-50%) rotate(-12deg) scaleX(.84); }
  50% { opacity: .95; transform: translateY(-50%) rotate(-12deg) scaleX(1.08); }
}
@keyframes omniCopaPremiumOrbit {
  0% { transform: rotate(0deg) scale(1); opacity: .74; }
  50% { transform: rotate(180deg) scale(1.035); opacity: 1; }
  100% { transform: rotate(360deg) scale(1); opacity: .74; }
}
@keyframes omniCopaPremiumOrbitReverse {
  0% { transform: rotate(360deg) scale(1); opacity: .9; }
  50% { transform: rotate(180deg) scale(1.05); opacity: 1; }
  100% { transform: rotate(0deg) scale(1); opacity: .9; }
}
@keyframes omniCopaPremiumBallSpin {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.035); }
  100% { transform: rotate(360deg) scale(1); }
}
@keyframes omniCopaPremiumCardEnter {
  0% { opacity: 0; transform: translateX(-50%) translateY(58px) scale(.94); filter: blur(8px); }
  64% { opacity: 1; transform: translateX(-50%) translateY(-6px) scale(1.015); filter: blur(0); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); filter: blur(0); }
}
@keyframes omniCopaPremiumCardGlow {
  0%, 100% { box-shadow: 0 28px 82px rgba(0,0,0,.36), 0 0 0 1px rgba(255,255,255,.28), 0 0 42px rgba(255,223,0,.38), inset 0 1px 0 rgba(255,255,255,.64); }
  50% { box-shadow: 0 28px 82px rgba(0,0,0,.36), 0 0 0 1px rgba(255,255,255,.42), 0 0 58px rgba(255,223,0,.58), 0 0 30px rgba(0,156,59,.32), inset 0 1px 0 rgba(255,255,255,.72); }
}
@keyframes omniCopaPremiumCardShine {
  0%, 35% { transform: translateX(-115%); opacity: 0; }
  48% { opacity: 1; }
  70%, 100% { transform: translateX(115%); opacity: 0; }
}
@keyframes omniCopaPremiumTitleReveal {
  0% { opacity: 0; transform: translateY(16px) scale(.96); letter-spacing: -.1em; }
  100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: -.06em; }
}
@keyframes omniCopaPremiumTextReveal {
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes omniCopaPremiumDot {
  0%, 100% { transform: scale(.8); opacity: .68; }
  50% { transform: scale(1.22); opacity: 1; }
}
`;

