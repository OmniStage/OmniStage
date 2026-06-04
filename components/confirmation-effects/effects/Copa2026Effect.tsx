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
    >
      <style>{keyframesCss}</style>

      <div style={backgroundStyle} aria-hidden="true" />
      <div style={shadeStyle} aria-hidden="true" />

      <div style={ballStyle} aria-hidden="true">
        ⚽
      </div>

      <div style={goalPopupStyle}>
        <strong style={goalTitleStyle}>{confirming ? "CONFIRMANDO..." : "GOOOOOOL!"}</strong>
        <span style={goalTextStyle}>
          {confirming
            ? "Estamos registrando sua confirmação."
            : "Sua presença está confirmada. Você foi convocado para essa festa campeã!"}
        </span>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  inset: 0,
  zIndex: 80,
  overflow: "hidden",
  pointerEvents: "none",
  display: "grid",
  placeItems: "center",
  background: "#061b45",
};

const backgroundStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: "url('/effects/copa2026-confirmacao.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  transform: "scale(1.01)",
};

const shadeStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at 72% 20%, rgba(255,223,0,.16), transparent 22%), radial-gradient(circle at 50% 84%, rgba(0,0,0,.16), transparent 34%)",
};

const ballStyle: CSSProperties = {
  position: "absolute",
  right: "clamp(20px, 7vw, 58px)",
  top: "clamp(28px, 9vw, 76px)",
  width: "clamp(72px, 20vw, 132px)",
  height: "clamp(72px, 20vw, 132px)",
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  fontSize: "clamp(46px, 13vw, 84px)",
  background: "radial-gradient(circle at 34% 28%, #ffffff, #f8fafc 46%, #d1d5db 100%)",
  border: "5px solid rgba(255,255,255,.94)",
  outline: "5px solid rgba(255,223,0,.64)",
  boxShadow:
    "0 18px 42px rgba(0,0,0,.34), 0 0 34px rgba(255,223,0,.86), 0 0 0 10px rgba(0,156,59,.16)",
  animation: "omniCopaBallEnter .72s cubic-bezier(.2,.9,.2,1) both, omniCopaBallLoop 2.4s linear .72s infinite",
};

const goalPopupStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: "clamp(38px, 10vw, 78px)",
  transform: "translateX(-50%)",
  width: "min(390px, calc(100% - 34px))",
  borderRadius: 30,
  padding: "18px 16px 17px",
  boxSizing: "border-box",
  display: "grid",
  justifyItems: "center",
  gap: 8,
  textAlign: "center",
  color: "#ffffff",
  background: "linear-gradient(135deg, rgba(0,39,118,.74), rgba(0,156,59,.62))",
  backdropFilter: "blur(16px) saturate(1.65)",
  WebkitBackdropFilter: "blur(16px) saturate(1.65)",
  border: "2px solid rgba(255,255,255,.84)",
  boxShadow:
    "0 26px 82px rgba(0,0,0,.36), 0 0 0 1px rgba(255,255,255,.48), 0 0 38px rgba(255,223,0,.58), inset 0 1px 0 rgba(255,255,255,.65)",
  animation: "omniCopaGoalPopup .9s cubic-bezier(.22,1,.36,1) .18s both, omniCopaGoalPulse 1.35s ease-in-out 1.1s 3",
};

const goalTitleStyle: CSSProperties = {
  fontSize: "clamp(42px, 13vw, 62px)",
  lineHeight: .88,
  fontWeight: 950,
  letterSpacing: "-.055em",
  textTransform: "uppercase",
  color: "#ffffff",
  textShadow:
    "0 4px 0 rgba(0,39,118,.78), 0 10px 22px rgba(0,0,0,.46), 0 0 22px rgba(255,255,255,.72)",
  WebkitTextStroke: "1px rgba(0,39,118,.48)",
};

const goalTextStyle: CSSProperties = {
  maxWidth: 330,
  fontSize: "clamp(15px, 4.4vw, 19px)",
  lineHeight: 1.18,
  fontWeight: 900,
  color: "#ffffff",
  textShadow: "0 3px 12px rgba(0,0,0,.58)",
};

const keyframesCss = `
@keyframes omniCopaBallEnter {
  0% { opacity: 0; transform: translate3d(130px,-70px,0) scale(.58) rotate(-260deg); }
  68% { opacity: 1; transform: translate3d(-8px,8px,0) scale(1.12) rotate(24deg); }
  100% { opacity: 1; transform: translate3d(0,0,0) scale(1) rotate(0deg); }
}
@keyframes omniCopaBallLoop {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.07); }
  100% { transform: rotate(360deg) scale(1); }
}
@keyframes omniCopaGoalPopup {
  0% { opacity: 0; transform: translateX(-50%) translateY(120px) scale(.62); }
  58% { opacity: 1; transform: translateX(-50%) translateY(-14px) scale(1.08); }
  78% { transform: translateX(-50%) translateY(7px) scale(.98); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes omniCopaGoalPulse {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.16); }
}
`;
