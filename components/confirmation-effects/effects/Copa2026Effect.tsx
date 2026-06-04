"use client";

import type { CSSProperties } from "react";
import type { ConfirmationEffectProps } from "../types";

const COPA_2026_BACKGROUND = "/effects/copa2026-confirmacao.png";

export default function Copa2026Effect({ open, loading }: ConfirmationEffectProps) {
  if (!open) return null;

  return (
    <div style={overlayStyle} aria-hidden="true">
      <style jsx>{`
        @keyframes copa2026In {
          0% { opacity: 0; transform: scale(1.015); filter: brightness(.85) saturate(.9); }
          100% { opacity: 1; transform: scale(1); filter: brightness(1) saturate(1); }
        }

        @keyframes copa2026BallSpin {
          0% { transform: rotate(0deg) scale(1); }
          35% { transform: rotate(130deg) scale(1.08); }
          70% { transform: rotate(260deg) scale(1.03); }
          100% { transform: rotate(360deg) scale(1); }
        }

        @keyframes copa2026BallRing {
          0% { transform: rotate(0deg) scale(1); opacity: .8; }
          50% { transform: rotate(180deg) scale(1.06); opacity: 1; }
          100% { transform: rotate(360deg) scale(1); opacity: .8; }
        }

        @keyframes copa2026PopupGoal {
          0% { opacity: 0; transform: translate3d(0, 80px, 0) scale(.78); filter: blur(4px); }
          58% { opacity: 1; transform: translate3d(0, -10px, 0) scale(1.055); filter: blur(0); }
          78% { opacity: 1; transform: translate3d(0, 5px, 0) scale(.985); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }

        @keyframes copa2026GoalPulse {
          0%, 100% { transform: scale(1); text-shadow: 0 4px 0 rgba(0,0,0,.35), 0 0 20px rgba(255,223,0,.65); }
          50% { transform: scale(1.025); text-shadow: 0 4px 0 rgba(0,0,0,.35), 0 0 34px rgba(255,223,0,.95); }
        }

        @keyframes copa2026StarPop {
          0% { opacity: 0; transform: translateY(12px) scale(.4); }
          75% { opacity: 1; transform: translateY(-3px) scale(1.15); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes copa2026Shine {
          0%, 100% { opacity: .2; transform: translateX(-18%) rotate(-8deg); }
          50% { opacity: .72; transform: translateX(18%) rotate(-8deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .copa2026Ball,
          .copa2026BallRing,
          .copa2026Popup,
          .copa2026Goal,
          .copa2026Star,
          .copa2026Shine {
            animation: none !important;
          }
        }
      `}</style>

      <div style={posterStyle}>
        <div style={backgroundStyle} />
        <div className="copa2026Shine" style={shineStyle} />

        <div style={ballAreaStyle}>
          <div className="copa2026BallRing" style={ballRingStyle} />
          <div className="copa2026Ball" style={ballStyle}>⚽</div>
        </div>

        <div className="copa2026Popup" style={popupStyle}>
          <strong className="copa2026Goal" style={goalStyle}>
            {loading ? "CONFIRMANDO..." : "GOOOOOOOL!"}
          </strong>
          <span style={messageStyle}>
            {loading ? "Estamos registrando sua presença." : "Sua presença está confirmada."}
            <br />
            {loading ? "Aguarde um instante." : "Você foi convocado para essa festa!"}
          </span>
          {!loading ? (
            <div style={starsStyle}>
              {[0, 1, 2, 3, 4].map((item) => (
                <span
                  key={item}
                  className="copa2026Star"
                  style={{ animation: `copa2026StarPop .42s cubic-bezier(.22,1,.36,1) ${0.7 + item * 0.08}s both` }}
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
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "grid",
  placeItems: "center",
  pointerEvents: "none",
  overflow: "hidden",
  background: "rgba(0,0,0,.72)",
};

const posterStyle: CSSProperties = {
  position: "relative",
  width: "min(100vw, 520px)",
  height: "min(100vh, calc(100vw * 1.333984375))",
  maxHeight: "100vh",
  aspectRatio: "1024 / 1366",
  overflow: "hidden",
  background: "#04190c",
  animation: "copa2026In .26s ease-out both",
};

const backgroundStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: `url(${COPA_2026_BACKGROUND})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

const shineStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  background: "linear-gradient(100deg, transparent 0 38%, rgba(255,255,255,.18) 45%, transparent 55% 100%)",
  mixBlendMode: "screen",
  animation: "copa2026Shine 2.4s ease-in-out infinite",
};

const ballAreaStyle: CSSProperties = {
  position: "absolute",
  zIndex: 5,
  top: "10.1%",
  right: "1.7%",
  width: "28.4%",
  aspectRatio: "1 / 1",
  display: "grid",
  placeItems: "center",
};

const ballRingStyle: CSSProperties = {
  position: "absolute",
  inset: "-7%",
  borderRadius: 999,
  background: "conic-gradient(from 0deg, rgba(255,255,255,.2), rgba(255,223,0,1), rgba(255,108,0,.82), rgba(0,39,118,1), rgba(255,255,255,.85), rgba(255,223,0,1))",
  boxShadow: "0 0 18px rgba(255,223,0,.95), 0 0 34px rgba(255,122,0,.7)",
  animation: "copa2026BallRing 1.35s linear infinite",
};

const ballStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  width: "69%",
  height: "69%",
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  fontSize: "clamp(54px, 17vw, 92px)",
  lineHeight: 1,
  background: "radial-gradient(circle at 34% 28%, #fff 0 27%, #f4f4f4 52%, #cfcfcf 100%)",
  boxShadow: "0 12px 26px rgba(0,0,0,.38), 0 0 0 6px rgba(255,255,255,.86), 0 0 28px rgba(255,223,0,.9)",
  animation: "copa2026BallSpin 1.7s linear infinite",
};

const popupStyle: CSSProperties = {
  position: "absolute",
  zIndex: 6,
  left: "7.4%",
  right: "7.4%",
  bottom: "9.4%",
  minHeight: "25.4%",
  borderRadius: "clamp(18px, 4vw, 34px)",
  display: "grid",
  justifyItems: "center",
  alignContent: "center",
  gap: "clamp(8px, 1.6vw, 14px)",
  padding: "clamp(18px, 4vw, 34px) clamp(14px, 3.6vw, 30px)",
  background: "linear-gradient(180deg, rgba(8,24,38,.34), rgba(10,32,50,.24))",
  border: "2px solid rgba(255,255,255,.92)",
  boxShadow: "0 0 0 1px rgba(255,255,255,.45), 0 20px 55px rgba(0,0,0,.38), 0 0 38px rgba(255,223,0,.78), inset 0 1px 0 rgba(255,255,255,.8)",
  backdropFilter: "blur(3px) saturate(1.25)",
  WebkitBackdropFilter: "blur(3px) saturate(1.25)",
  animation: "copa2026PopupGoal .82s cubic-bezier(.22,1,.36,1) .16s both",
};

const goalStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "clamp(44px, 12.4vw, 72px)",
  lineHeight: .88,
  fontWeight: 950,
  letterSpacing: "-.045em",
  textAlign: "center",
  textTransform: "uppercase",
  textShadow: "0 4px 0 rgba(0,0,0,.35), 0 9px 22px rgba(0,0,0,.52), 0 0 24px rgba(255,223,0,.78)",
  WebkitTextStroke: "1px rgba(255,255,255,.3)",
  animation: "copa2026GoalPulse 1.15s ease-in-out .62s infinite",
};

const messageStyle: CSSProperties = {
  maxWidth: 420,
  color: "#ffffff",
  fontSize: "clamp(20px, 5.1vw, 32px)",
  lineHeight: 1.16,
  fontWeight: 900,
  textAlign: "center",
  textShadow: "0 3px 12px rgba(0,0,0,.7), 0 0 16px rgba(255,255,255,.28)",
};

const starsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "clamp(11px, 3vw, 24px)",
  marginTop: "clamp(4px, 1vw, 8px)",
  color: "#ffffff",
  fontSize: "clamp(27px, 7.4vw, 46px)",
  lineHeight: 1,
  textShadow: "0 3px 12px rgba(0,0,0,.58), 0 0 18px rgba(255,223,0,.75)",
};
