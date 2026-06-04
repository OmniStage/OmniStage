"use client";

import type { CSSProperties } from "react";
import type { ConfirmationEffectProps } from "../types";

const COPA_2026_BACKGROUND = "/effects/copa2026-confirmacao.png";

export default function Copa2026Effect({ open, loading }: ConfirmationEffectProps) {
  if (!open) return null;

  return (
    <div style={overlayStyle} aria-hidden="true">
      <style jsx>{`
        @keyframes copa2026PosterIn {
          0% { opacity: 0; transform: scale(0.985); filter: brightness(.86) saturate(.92); }
          100% { opacity: 1; transform: scale(1); filter: brightness(1) saturate(1); }
        }

        @keyframes copa2026BallFloat {
          0% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          35% { transform: translate3d(-8px, -7px, 0) rotate(126deg) scale(1.055); }
          70% { transform: translate3d(6px, 4px, 0) rotate(252deg) scale(1.02); }
          100% { transform: translate3d(0, 0, 0) rotate(360deg) scale(1); }
        }

        @keyframes copa2026BallAura {
          0% { transform: rotate(0deg) scale(1); opacity: .74; }
          50% { transform: rotate(180deg) scale(1.08); opacity: 1; }
          100% { transform: rotate(360deg) scale(1); opacity: .74; }
        }

        @keyframes copa2026GoalPopup {
          0% { opacity: 0; transform: translate3d(0, 95px, 0) scale(.82); filter: blur(3px); }
          54% { opacity: 1; transform: translate3d(0, -12px, 0) scale(1.055); filter: blur(0); }
          72% { transform: translate3d(0, 5px, 0) scale(.985); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }

        @keyframes copa2026GoalText {
          0% { transform: scale(.72); opacity: 0; letter-spacing: -.11em; }
          58% { transform: scale(1.09); opacity: 1; letter-spacing: -.04em; }
          100% { transform: scale(1); opacity: 1; letter-spacing: -.045em; }
        }

        @keyframes copa2026GoalGlow {
          0%, 100% { opacity: .42; transform: scale(.985); }
          50% { opacity: 1; transform: scale(1.025); }
        }

        @keyframes copa2026StarPop {
          0% { opacity: 0; transform: translateY(14px) scale(.42) rotate(-18deg); }
          70% { opacity: 1; transform: translateY(-3px) scale(1.14) rotate(6deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
        }

        @keyframes copa2026ConfettiFall {
          0% { opacity: 0; transform: translate3d(0, -12vh, 0) rotate(0deg); }
          10% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(var(--x), 112vh, 0) rotate(720deg); }
        }

        @keyframes copa2026Flash {
          0%, 100% { opacity: 0; }
          12% { opacity: .95; }
          34% { opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .copa2026Ball,
          .copa2026BallAura,
          .copa2026GoalPopup,
          .copa2026GoalText,
          .copa2026GoalGlow,
          .copa2026Star,
          .copa2026Confetti,
          .copa2026Flash {
            animation: none !important;
          }
        }
      `}</style>

      <div style={posterStyle}>
        <div style={backgroundStyle} />
        <div className="copa2026Flash" style={flashStyle} />

        <div style={confettiLayerStyle}>
          {Array.from({ length: 42 }).map((_, index) => {
            const colors = ["#ffdf00", "#009c3b", "#002776", "#ffffff", "#00a1de"];
            const size = 5 + (index % 5) * 2;

            return (
              <span
                key={index}
                className="copa2026Confetti"
                style={{
                  position: "absolute",
                  left: `${(index * 37) % 100}%`,
                  top: -20,
                  width: size,
                  height: index % 3 === 0 ? size : size + 4,
                  borderRadius: index % 4 === 0 ? 999 : 2,
                  background: colors[index % colors.length],
                  boxShadow: "0 0 13px rgba(255,223,0,.45)",
                  animation: `copa2026ConfettiFall ${2.15 + (index % 7) * 0.18}s linear ${(index % 12) * 0.12}s infinite`,
                  ["--x" as any]: `${((index % 9) - 4) * 18}px`,
                }}
              />
            );
          })}
        </div>

        <div style={ballWrapStyle}>
          <div className="copa2026BallAura" style={ballAuraStyle} />
          <div className="copa2026Ball" style={ballStyle}>⚽</div>
        </div>

        <div className="copa2026GoalPopup" style={goalPopupStyle}>
          <div className="copa2026GoalGlow" style={goalGlowStyle} />
          <strong className="copa2026GoalText" style={goalTextStyle}>
            {loading ? "CONFIRMANDO..." : "GOOOOOOOL!"}
          </strong>
          <span style={messageStyle}>
            {loading
              ? "Estamos registrando sua confirmação."
              : "Sua presença está confirmada. Você foi convocado para essa festa!"}
          </span>
          {!loading ? (
            <div style={starsStyle}>
              {[0, 1, 2, 3, 4].map((item) => (
                <span
                  key={item}
                  className="copa2026Star"
                  style={{
                    display: "inline-block",
                    animation: `copa2026StarPop .42s cubic-bezier(.22,1,.36,1) ${0.62 + item * 0.08}s both`,
                  }}
                >
                  ★
                </span>
              ))}
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
  padding: 0,
  background: "rgba(0,0,0,.08)",
};

const posterStyle: CSSProperties = {
  position: "relative",
  width: "min(100vw, 430px)",
  aspectRatio: "1024 / 1365",
  overflow: "hidden",
  borderRadius: "clamp(0px, 2vw, 22px)",
  boxShadow: "0 30px 95px rgba(0,0,0,.42)",
  animation: "copa2026PosterIn .26s ease-out both",
};

const backgroundStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: `url(${COPA_2026_BACKGROUND})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

const flashStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 3,
  background:
    "radial-gradient(circle at 77% 16%, rgba(255,255,255,.92), transparent 12%), radial-gradient(circle at 50% 71%, rgba(255,223,0,.42), transparent 35%)",
  mixBlendMode: "screen",
  animation: "copa2026Flash 1.15s ease-out .2s both",
};

const confettiLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 4,
  overflow: "hidden",
};

const ballWrapStyle: CSSProperties = {
  position: "absolute",
  zIndex: 8,
  top: "9.8%",
  right: "2.8%",
  width: "28%",
  aspectRatio: "1 / 1",
  display: "grid",
  placeItems: "center",
};

const ballAuraStyle: CSSProperties = {
  position: "absolute",
  inset: "-10%",
  borderRadius: 999,
  background:
    "conic-gradient(from 20deg, rgba(255,223,0,.06), rgba(255,223,0,.96), rgba(255,122,0,.72), rgba(0,39,118,.88), rgba(255,255,255,.82), rgba(255,223,0,.06))",
  filter: "blur(.2px) drop-shadow(0 0 18px rgba(255,223,0,.9))",
  animation: "copa2026BallAura 1.45s linear infinite",
};

const ballStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  width: "72%",
  height: "72%",
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  fontSize: "clamp(58px, 18vw, 94px)",
  lineHeight: 1,
  background: "radial-gradient(circle at 36% 28%, #ffffff 0 28%, #f4f4f4 54%, #d6d6d6 100%)",
  boxShadow:
    "0 14px 30px rgba(0,0,0,.36), 0 0 0 4px rgba(255,255,255,.8), 0 0 32px rgba(255,223,0,.84)",
  animation: "copa2026BallFloat 1.85s linear infinite",
};

const goalPopupStyle: CSSProperties = {
  position: "absolute",
  left: "6.8%",
  right: "6.8%",
  bottom: "9.5%",
  zIndex: 9,
  minHeight: "24.4%",
  borderRadius: "clamp(18px, 4vw, 36px)",
  display: "grid",
  justifyItems: "center",
  alignContent: "center",
  gap: "clamp(6px, 1.4vw, 12px)",
  padding: "clamp(16px, 4vw, 31px) clamp(12px, 3.4vw, 28px)",
  background: "linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,.10))",
  backdropFilter: "blur(10px) saturate(1.6)",
  WebkitBackdropFilter: "blur(10px) saturate(1.6)",
  border: "2px solid rgba(255,255,255,.86)",
  boxShadow:
    "0 0 0 1px rgba(255,255,255,.38), 0 18px 48px rgba(0,0,0,.36), 0 0 34px rgba(255,223,0,.72), inset 0 1px 0 rgba(255,255,255,.78)",
  animation: "copa2026GoalPopup .78s cubic-bezier(.22,1,.36,1) .18s both",
};

const goalGlowStyle: CSSProperties = {
  position: "absolute",
  inset: "-8% -5%",
  borderRadius: "inherit",
  zIndex: -1,
  background:
    "radial-gradient(circle at 50% 28%, rgba(255,223,0,.74), transparent 48%), radial-gradient(circle at 50% 100%, rgba(0,39,118,.48), transparent 52%)",
  filter: "blur(10px)",
  animation: "copa2026GoalGlow 1.35s ease-in-out infinite",
};

const goalTextStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "clamp(36px, 11vw, 58px)",
  lineHeight: .9,
  fontWeight: 950,
  letterSpacing: "-.045em",
  textAlign: "center",
  textTransform: "uppercase",
  textShadow:
    "0 3px 0 rgba(0,0,0,.45), 0 8px 20px rgba(0,0,0,.55), 0 0 18px rgba(255,223,0,.78)",
  WebkitTextStroke: "1px rgba(255,255,255,.28)",
  animation: "copa2026GoalText .54s cubic-bezier(.22,1,.36,1) .38s both",
};

const messageStyle: CSSProperties = {
  maxWidth: 340,
  color: "#ffffff",
  fontSize: "clamp(17px, 4.5vw, 24px)",
  lineHeight: 1.13,
  fontWeight: 900,
  textAlign: "center",
  textShadow: "0 3px 12px rgba(0,0,0,.66), 0 0 15px rgba(255,255,255,.24)",
};

const starsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "clamp(8px, 2.8vw, 20px)",
  marginTop: "clamp(4px, 1vw, 8px)",
  color: "#ffffff",
  fontSize: "clamp(24px, 7vw, 42px)",
  lineHeight: 1,
  textShadow: "0 3px 12px rgba(0,0,0,.58), 0 0 18px rgba(255,223,0,.72)",
};
