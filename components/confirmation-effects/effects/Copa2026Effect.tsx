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

        <div style={sideFadeStyle} />
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
  padding: 0,
  boxSizing: "border-box",
  background: "transparent",
};

const stageStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  width: "min(72%, 360px, calc(74vh * 832 / 1104))",
  aspectRatio: "832 / 1104",
  borderRadius: "24px",
  overflow: "hidden",
  transformOrigin: "center",
  transform: "translate3d(0, -2%, 0)",
  background: "transparent",
  boxShadow: "0 16px 40px rgba(2,6,23,.22)",
  animation:
    "omniCopaVideoEnter .38s cubic-bezier(.16,1,.3,1) both, omniCopaVideoFloat 3.8s ease-in-out .8s infinite",
};

const videoStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center center",
  display: "block",
  borderRadius: "24px",

  /*
   * O dourado/preto lateral está renderizado dentro do próprio MP4.
   * Não dá para transformar esse pixel em transparência real via CSS,
   * então o ajuste correto por programação é fazer crop + máscara:
   * aumenta levemente o vídeo para jogar a área dura para fora.
   */
  transform: "translate(-50%, -50%) scale(1.16)",
  transformOrigin: "center center",
};

const sideFadeStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  borderRadius: "24px",
  pointerEvents: "none",

  /*
   * Camada sutil para matar a faixa dura lateral sem criar outro card.
   * Ela faz a borda do vídeo se misturar com o convite de fundo.
   */
  background:
    "linear-gradient(90deg, rgba(2,6,23,.06) 0%, transparent 10%, transparent 90%, rgba(2,6,23,.06) 100%), linear-gradient(180deg, rgba(255,255,255,.04), transparent 22%, transparent 78%, rgba(2,6,23,.04))",
};

const borderStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  borderRadius: "24px",
  border: "1.25px solid rgba(255,223,0,.72)",
  boxShadow:
    "inset 0 0 10px rgba(255,223,0,.18), 0 0 14px rgba(255,223,0,.24)",
};

const shineStyle: CSSProperties = {
  position: "absolute",
  zIndex: 3,
  top: 0,
  bottom: 0,
  left: "-52%",
  width: "30%",
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
  56% { opacity: .44; }
  84%, 100% { transform: translateX(480%) skewX(-14deg); opacity: 0; }
}
`;
