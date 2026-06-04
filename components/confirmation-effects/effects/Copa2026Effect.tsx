"use client";

import type { CSSProperties } from "react";
import type { ConfirmationEffectProps } from "../types";

export default function Copa2026Effect({ open, loading }: ConfirmationEffectProps) {
  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <style jsx>{`
        @keyframes omniCopa2026Enter {
          0% { opacity: 0; transform: translateY(22px) scale(.9) rotate(-1deg); filter: brightness(.85) saturate(.9); }
          58% { opacity: 1; transform: translateY(-4px) scale(1.025) rotate(.4deg); filter: brightness(1.12) saturate(1.18); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); filter: brightness(1) saturate(1); }
        }
        @keyframes omniCopa2026Pulse {
          0%, 100% { transform: scale(.96); opacity: .72; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes omniCopa2026Trophy {
          0% { transform: translateY(10px) scale(.82) rotate(-5deg); opacity: 0; }
          52% { transform: translateY(-5px) scale(1.08) rotate(4deg); opacity: 1; }
          100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes omniCopa2026Goal {
          0% { transform: scale(.65); opacity: 0; letter-spacing: -.09em; }
          56% { transform: scale(1.13); opacity: 1; letter-spacing: -.035em; }
          100% { transform: scale(1); opacity: 1; letter-spacing: -.045em; }
        }
        @keyframes omniCopa2026Confetti {
          0% { transform: translate3d(0, -90px, 0) rotate(0deg); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translate3d(var(--x), 80vh, 0) rotate(720deg); opacity: 0; }
        }
        @keyframes omniCopa2026Sparkle {
          0%, 100% { transform: scale(.72) rotate(0deg); opacity: .42; }
          50% { transform: scale(1.18) rotate(8deg); opacity: 1; }
        }
        @keyframes omniCopa2026Ball {
          0% { transform: rotate(-24deg) scale(.78); opacity: 0; }
          45% { transform: rotate(22deg) scale(1.12); opacity: 1; }
          100% { transform: rotate(360deg) scale(1); opacity: 1; }
        }
        @keyframes omniCopa2026Wave {
          0%, 100% { transform: rotate(-7deg) translateY(0); }
          50% { transform: rotate(6deg) translateY(-4px); }
        }
      `}</style>

      <div style={confettiLayerStyle} aria-hidden="true">
        {Array.from({ length: 72 }).map((_, index) => {
          const colors = ["#009c3b", "#ffdf00", "#002776", "#ffffff", "#ff7a00"];
          const color = colors[index % colors.length];
          const size = 7 + (index % 6) * 3;

          return (
            <span
              key={index}
              style={{
                position: "absolute",
                left: `${(index * 29) % 100}%`,
                top: -26,
                width: size,
                height: index % 4 === 0 ? size : Math.max(5, size - 2),
                borderRadius: index % 4 === 0 ? 999 : 3,
                background: index % 9 === 0 ? "#ffffff" : color,
                boxShadow: index % 9 === 0 ? "inset 0 0 0 2px #111827" : "0 8px 18px rgba(0,0,0,.18)",
                animation: `omniCopa2026Confetti ${1.5 + (index % 6) * 0.13}s ease-in ${(index % 12) * 0.045}s both`,
                ["--x" as any]: `${((index % 11) - 5) * 30}px`,
              }}
            />
          );
        })}

        {Array.from({ length: 14 }).map((_, index) => (
          <span
            key={`spark-${index}`}
            style={{
              position: "absolute",
              left: `${6 + ((index * 17) % 88)}%`,
              top: `${8 + ((index * 21) % 78)}%`,
              color: ["#ffffff", "#ffdf00", "#009c3b", "#002776"][(index + 1) % 4],
              fontSize: 16 + (index % 4) * 5,
              textShadow: "0 0 16px rgba(255,255,255,.7)",
              animation: `omniCopa2026Sparkle ${0.9 + (index % 4) * 0.12}s ease-in-out ${index * 0.07}s infinite`,
            }}
          >
            ✦
          </span>
        ))}
      </div>

      <div style={posterCardStyle}>
        <div style={whiteStickerBorderStyle} />
        <div style={colorTopStyle} />
        <div style={colorBottomStyle} />
        <div style={flagLeftStyle}>🇧🇷</div>
        <div style={flagRightStyle}>🇧🇷</div>
        <div style={ballCircleStyle}>⚽</div>
        <div style={trophyStyle}>🏆</div>
        <div style={worldCupTextStyle}>WORLD CUP 2026</div>

        <div style={glassGoalCardStyle}>
          <strong style={goalTextStyle}>{loading ? "CONFIRMANDO..." : "GOOOOOOL!"}</strong>
          <span style={messageStyle}>
            {loading
              ? "Estamos registrando sua confirmação."
              : "Sua presença está confirmada. Você foi convocado para essa festa!"}
          </span>
          {!loading ? (
            <div style={starsStyle} aria-hidden="true">
              <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 80,
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
  overflow: "hidden",
  padding: 16,
  background:
    "radial-gradient(circle at 50% 20%, rgba(255,223,0,.28), transparent 28%), radial-gradient(circle at 18% 76%, rgba(0,156,59,.34), transparent 32%), radial-gradient(circle at 82% 72%, rgba(0,39,118,.34), transparent 32%), rgba(2,6,23,.20)",
};

const confettiLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  pointerEvents: "none",
};

const posterCardStyle: CSSProperties = {
  width: "min(374px, calc(100% - 12px))",
  minHeight: 540,
  borderRadius: 34,
  position: "relative",
  overflow: "hidden",
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  padding: "26px 18px 28px",
  color: "#fff",
  border: "5px solid rgba(255,255,255,.98)",
  background:
    "radial-gradient(circle at 50% 12%, rgba(255,255,255,.4), transparent 15%), linear-gradient(145deg, #0032a0 0%, #0a7e38 34%, #ffdf00 58%, #ff7a00 78%, #00a1de 100%)",
  boxShadow:
    "0 24px 88px rgba(0,0,0,.42), 0 0 0 2px rgba(255,255,255,.72), 0 0 54px rgba(255,223,0,.56)",
  animation: "omniCopa2026Enter .42s cubic-bezier(.2,.9,.2,1)",
};

const whiteStickerBorderStyle: CSSProperties = {
  position: "absolute",
  inset: 10,
  borderRadius: 27,
  border: "2px solid rgba(255,255,255,.78)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.32)",
  pointerEvents: "none",
};

const colorTopStyle: CSSProperties = {
  position: "absolute",
  inset: "0 0 auto 0",
  height: 170,
  background:
    "radial-gradient(circle at 16% 28%, #ffdf00 0 16%, transparent 17%), radial-gradient(circle at 78% 22%, #00a1de 0 15%, transparent 16%), linear-gradient(90deg, rgba(0,50,160,.78), rgba(0,156,59,.68), rgba(255,223,0,.58))",
  opacity: .98,
};

const colorBottomStyle: CSSProperties = {
  position: "absolute",
  inset: "auto 0 0 0",
  height: 210,
  background:
    "radial-gradient(circle at 18% 70%, rgba(255,122,0,.94) 0 18%, transparent 19%), radial-gradient(circle at 82% 68%, rgba(0,39,118,.9) 0 16%, transparent 17%), linear-gradient(135deg, rgba(0,156,59,.82), rgba(255,223,0,.72), rgba(0,50,160,.72))",
  opacity: .95,
};

const flagLeftStyle: CSSProperties = {
  position: "absolute",
  bottom: 22,
  left: 22,
  fontSize: 40,
  filter: "drop-shadow(0 9px 16px rgba(0,0,0,.38))",
  animation: "omniCopa2026Wave .95s ease-in-out infinite",
};

const flagRightStyle: CSSProperties = {
  position: "absolute",
  bottom: 22,
  right: 22,
  fontSize: 40,
  filter: "drop-shadow(0 9px 16px rgba(0,0,0,.38))",
  animation: "omniCopa2026Wave .95s ease-in-out .12s infinite",
};

const ballCircleStyle: CSSProperties = {
  position: "absolute",
  top: 22,
  right: 22,
  width: 76,
  height: 76,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  fontSize: 44,
  background: "rgba(255,255,255,.94)",
  border: "5px solid #ffffff",
  outline: "5px solid rgba(255,223,0,.65)",
  boxShadow: "0 12px 30px rgba(0,0,0,.3), 0 0 34px rgba(255,223,0,.78)",
  animation: "omniCopa2026Ball .95s cubic-bezier(.2,.9,.2,1)",
  zIndex: 4,
};

const trophyStyle: CSSProperties = {
  position: "relative",
  zIndex: 3,
  fontSize: 96,
  lineHeight: 1,
  marginTop: 32,
  filter: "drop-shadow(0 16px 26px rgba(0,0,0,.34)) drop-shadow(0 0 24px rgba(255,223,0,.62))",
  animation: "omniCopa2026Trophy .62s cubic-bezier(.2,.9,.2,1) both",
};

const worldCupTextStyle: CSSProperties = {
  position: "relative",
  zIndex: 3,
  marginTop: 10,
  fontSize: 22,
  fontWeight: 950,
  letterSpacing: ".04em",
  color: "#ffffff",
  textShadow: "0 3px 0 rgba(0,39,118,.58), 0 10px 22px rgba(0,0,0,.36)",
};

const glassGoalCardStyle: CSSProperties = {
  position: "relative",
  zIndex: 5,
  width: "min(312px, calc(100% - 18px))",
  marginTop: 28,
  borderRadius: 28,
  padding: "20px 16px 18px",
  display: "grid",
  justifyItems: "center",
  gap: 9,
  background: "rgba(255,255,255,.14)",
  backdropFilter: "blur(18px) saturate(1.65)",
  WebkitBackdropFilter: "blur(18px) saturate(1.65)",
  border: "2px solid rgba(255,255,255,.82)",
  boxShadow:
    "0 22px 74px rgba(0,0,0,.34), 0 0 0 1px rgba(255,255,255,.42), 0 0 34px rgba(255,223,0,.45), inset 0 1px 0 rgba(255,255,255,.72)",
  animation: "omniCopa2026Pulse 1.1s ease-in-out .12s 3",
};

const goalTextStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "clamp(40px, 12vw, 54px)",
  lineHeight: .92,
  fontWeight: 950,
  letterSpacing: "-.045em",
  textTransform: "uppercase",
  textShadow:
    "0 3px 0 rgba(0,39,118,.78), 0 8px 20px rgba(0,0,0,.46), 0 0 22px rgba(255,255,255,.72)",
  WebkitTextStroke: "1px rgba(0,39,118,.42)",
  animation: "omniCopa2026Goal .54s cubic-bezier(.2,.9,.2,1) both",
};

const messageStyle: CSSProperties = {
  maxWidth: 286,
  color: "#ffffff",
  fontSize: "clamp(16px, 4.6vw, 19px)",
  lineHeight: 1.18,
  fontWeight: 950,
  textAlign: "center",
  textShadow: "0 3px 12px rgba(0,0,0,.58), 0 0 16px rgba(255,255,255,.26)",
};

const starsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 10,
  marginTop: 4,
  color: "#ffffff",
  fontSize: 27,
  lineHeight: 1,
  textShadow: "0 3px 12px rgba(0,0,0,.55), 0 0 18px rgba(255,223,0,.72)",
};
