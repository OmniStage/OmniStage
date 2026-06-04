"use client";

import type { CSSProperties } from "react";
import type { ConfirmationEffectProps } from "../types";

export default function FutebolEffect({ open, loading }: ConfirmationEffectProps) {
  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <style jsx>{`
        @keyframes omniFutebolConfirmPop {
          0% { opacity: 0; transform: translateY(16px) scale(.92); filter: brightness(.88); }
          62% { opacity: 1; transform: translateY(-3px) scale(1.025); filter: brightness(1.08); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: brightness(1); }
        }
        @keyframes omniFutebolCardShine {
          0%, 100% { box-shadow: 0 26px 92px rgba(0,0,0,.34), 0 0 0 1px rgba(255,255,255,.56), 0 0 28px rgba(255,255,255,.18), inset 0 1px 0 rgba(255,255,255,.56); }
          50% { box-shadow: 0 30px 110px rgba(0,0,0,.42), 0 0 0 2px rgba(255,255,255,.9), 0 0 44px rgba(254,221,0,.72), 0 0 92px rgba(0,156,59,.36), inset 0 1px 0 rgba(255,255,255,.78); }
        }
        @keyframes omniFutebolBall {
          0% { transform: rotate(-28deg) scale(.76); opacity: 0; }
          36% { transform: rotate(18deg) scale(1.15); opacity: 1; }
          68% { transform: rotate(370deg) scale(1.03); opacity: 1; }
          100% { transform: rotate(360deg) scale(1); opacity: 1; }
        }
        @keyframes omniFutebolTitlePop {
          0% { transform: scale(.72); opacity: 0; letter-spacing: -.08em; }
          58% { transform: scale(1.12); opacity: 1; letter-spacing: -.035em; }
          100% { transform: scale(1); opacity: 1; letter-spacing: -.04em; }
        }
        @keyframes omniFutebolConfettiFall {
          0% { transform: translate3d(0, -90px, 0) rotate(0deg); opacity: 0; }
          14% { opacity: 1; }
          100% { transform: translate3d(var(--x), 78vh, 0) rotate(680deg); opacity: 0; }
        }
        @keyframes omniFutebolSparklePulse {
          0%, 100% { transform: scale(.7); opacity: .48; }
          50% { transform: scale(1.18); opacity: 1; }
        }
        @keyframes omniFutebolGlowPulse {
          0%, 100% { opacity: .72; transform: scale(.96); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>

      <div style={particlesLayerStyle} aria-hidden="true">
        {Array.from({ length: 56 }).map((_, index) => {
          const colors = ["#009c3b", "#ffdf00", "#002776", "#ffffff"];
          const color = colors[index % colors.length];
          const size = 8 + (index % 5) * 4;

          return (
            <span
              key={index}
              style={{
                position: "absolute",
                left: `${(index * 37) % 100}%`,
                top: -24,
                width: size,
                height: index % 5 === 0 ? size : Math.max(5, size - 2),
                borderRadius: index % 5 === 0 ? 999 : 3,
                background: index % 5 === 0 ? "#ffffff" : color,
                color,
                boxShadow:
                  index % 5 === 0
                    ? "inset 0 0 0 2px #111827"
                    : "0 6px 18px rgba(0,0,0,.16)",
                animation: `omniFutebolConfettiFall ${1.35 + (index % 5) * 0.12}s ease-in ${(index % 10) * 0.055}s both`,
                ["--x" as any]: `${((index % 9) - 4) * 34}px`,
              }}
            />
          );
        })}

        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={`sparkle-${index}`}
            style={{
              position: "absolute",
              left: `${8 + ((index * 19) % 84)}%`,
              top: `${12 + ((index * 23) % 70)}%`,
              color: ["#009c3b", "#ffdf00", "#002776", "#ffffff"][(index + 1) % 4],
              fontSize: 16 + (index % 3) * 6,
              animation: `omniFutebolSparklePulse ${0.9 + (index % 4) * 0.12}s ease-in-out ${index * 0.08}s infinite`,
            }}
          >
            ★
          </span>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={cardGlowStyle} />
        <div style={ballStyle}>⚽</div>
        <strong style={titleStyle}>{loading ? "Confirmando..." : "GOOOOOOL!"}</strong>
        <span style={textStyle}>
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
  background:
    "radial-gradient(circle at 50% 38%, rgba(254,221,0,.18), transparent 30%), radial-gradient(circle at 24% 22%, rgba(0,156,59,.2), transparent 32%), radial-gradient(circle at 78% 72%, rgba(0,39,118,.2), transparent 34%), rgba(2,6,23,.24)",
  backdropFilter: "blur(.8px)",
  WebkitBackdropFilter: "blur(.8px)",
};

const particlesLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  pointerEvents: "none",
};

const cardStyle: CSSProperties = {
  width: "min(360px, calc(100% - 34px))",
  minHeight: 224,
  padding: "68px 18px 22px",
  overflow: "visible",
  position: "relative",
  borderRadius: 28,
  display: "grid",
  justifyItems: "center",
  gap: 10,
  textAlign: "center",
  color: "#ffffff",
  background: "rgba(255,255,255,.14)",
  backdropFilter: "blur(18px) saturate(1.55)",
  WebkitBackdropFilter: "blur(18px) saturate(1.55)",
  border: "2px solid rgba(255,255,255,.72)",
  boxShadow:
    "0 26px 92px rgba(0,0,0,.34), 0 0 0 1px rgba(255,255,255,.56), 0 0 28px rgba(255,255,255,.18), inset 0 1px 0 rgba(255,255,255,.56)",
  animation:
    "omniFutebolConfirmPop .36s cubic-bezier(.2,.9,.2,1), omniFutebolCardShine 1.05s ease-in-out .12s 3",
};

const cardGlowStyle: CSSProperties = {
  position: "absolute",
  inset: -2,
  borderRadius: 28,
  background:
    "radial-gradient(circle at 78% 0%, rgba(254,221,0,.38), transparent 24%), radial-gradient(circle at 10% 90%, rgba(0,156,59,.26), transparent 30%), linear-gradient(120deg, transparent 0%, rgba(255,255,255,.20) 42%, rgba(255,255,255,.08) 52%, transparent 64%)",
  opacity: .94,
  filter: "blur(.2px)",
  animation: "omniFutebolGlowPulse 1.2s ease-in-out 3",
  pointerEvents: "none",
};

const ballStyle: CSSProperties = {
  width: 82,
  height: 82,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  fontSize: 48,
  background:
    "radial-gradient(circle at 34% 28%, #ffffff, #f8fafc 42%, #d1d5db 100%)",
  position: "absolute",
  top: -44,
  right: 24,
  zIndex: 4,
  border: "5px solid rgba(255,255,255,.96)",
  outline: "5px solid rgba(0,39,118,.8)",
  boxShadow:
    "0 0 0 10px rgba(254,221,0,.24), 0 0 38px rgba(254,221,0,.92), 0 18px 42px rgba(0,0,0,.32)",
  animation: "omniFutebolBall .86s cubic-bezier(.2,.9,.2,1)",
};

const titleStyle: CSSProperties = {
  position: "relative",
  zIndex: 3,
  fontSize: "clamp(38px, 13vw, 52px)",
  letterSpacing: "-.04em",
  color: "#ffffff",
  textTransform: "uppercase",
  textShadow:
    "0 3px 0 rgba(0,39,118,.72), 0 8px 20px rgba(0,0,0,.44), 0 0 22px rgba(255,255,255,.55)",
  WebkitTextStroke: "1px rgba(2,6,23,.38)",
  animation: "omniFutebolTitlePop .52s cubic-bezier(.2,.9,.2,1) both",
};

const textStyle: CSSProperties = {
  position: "relative",
  zIndex: 3,
  maxWidth: 310,
  padding: "0 8px",
  color: "#ffffff",
  fontSize: "clamp(17px, 5vw, 20px)",
  lineHeight: 1.2,
  fontWeight: 950,
  textShadow: "0 3px 12px rgba(0,0,0,.56), 0 0 16px rgba(255,255,255,.28)",
};

const starsStyle: CSSProperties = {
  position: "relative",
  zIndex: 3,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 12,
  marginTop: 8,
  color: "#ffffff",
  fontSize: 31,
  lineHeight: 1,
  textShadow: "0 3px 12px rgba(0,0,0,.55), 0 0 18px rgba(254,221,0,.62)",
};
