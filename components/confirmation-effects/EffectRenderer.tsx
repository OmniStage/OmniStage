"use client";

import { useEffect, type CSSProperties } from "react";
import Copa2026Effect from "./effects/Copa2026Effect";
import { normalizeConfirmationEffect } from "./registry";
import { playConfirmationSound } from "./sounds";
import type { ConfirmationEffectProps } from "./types";

export default function EffectRenderer({
  open,
  effect,
  confirming = false,
  soundEnabled = true,
  contained = true,
}: ConfirmationEffectProps) {
  const activeEffect = normalizeConfirmationEffect(effect);

  useEffect(() => {
    if (!open || confirming || !soundEnabled || activeEffect === "nenhum") return;

    playConfirmationSound(activeEffect);
  }, [activeEffect, confirming, open, soundEnabled]);

  if (!open || activeEffect === "nenhum") return null;

  if (activeEffect === "copa2026") {
    return (
      <Copa2026Effect
        open={open}
        effect={activeEffect}
        confirming={confirming}
        soundEnabled={soundEnabled}
        contained={contained}
      />
    );
  }

  return (
    <div
      style={{
        ...overlayStyle,
        position: contained ? "absolute" : "fixed",
        ...getOverlayTheme(activeEffect),
      }}
    >
      <style>{keyframesCss}</style>
      {renderParticles(activeEffect)}

      <div style={{ ...cardStyle, ...getCardTheme(activeEffect) }}>
        {renderCardBackdrop(activeEffect)}

        <div style={{ ...iconStyle, ...getIconTheme(activeEffect) }}>
          {getIcon(activeEffect)}
        </div>

        <strong style={{ ...titleStyle, ...getTitleTheme(activeEffect) }}>
          {confirming ? "Confirmando presença..." : getTitle(activeEffect)}
        </strong>

        <span style={{ ...textStyle, ...getTextTheme(activeEffect) }}>
          {confirming
            ? "Estamos registrando sua confirmação."
            : getText(activeEffect)}
        </span>

        {activeEffect === "futebol" && !confirming ? (
          <div style={starsStyle} aria-hidden="true">
            <span>★</span>
            <span>★</span>
            <span>★</span>
            <span>★</span>
            <span>★</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getIcon(effect: string) {
  if (effect === "futebol" || effect === "copa2026") return "⚽";
  if (effect === "princesa") return "👑";
  if (effect === "luxo") return "✨";
  if (effect === "infantil") return "🎉";

  return "✓";
}

function getTitle(effect: string) {
  if (effect === "futebol") return "GOOOOOOL!";
  if (effect === "copa2026") return "GOOOOOOL!";
  if (effect === "princesa") return "Presença confirmada!";
  if (effect === "luxo") return "Confirmação registrada";
  if (effect === "infantil") return "Oba, presença confirmada!";

  return "Presença confirmada";
}

function getText(effect: string) {
  if (effect === "futebol") {
    return "Sua presença está confirmada. Você foi convocado para essa festa!";
  }

  if (effect === "copa2026") {
    return "Sua presença está confirmada para essa festa campeã.";
  }

  if (effect === "princesa") {
    return "Sua presença foi confirmada com brilho especial.";
  }

  if (effect === "luxo") {
    return "Sua confirmação foi registrada com sucesso.";
  }

  if (effect === "infantil") {
    return "Agora é só esperar a diversão começar.";
  }

  return "Sua confirmação foi registrada no convite.";
}

function getOverlayTheme(effect: string): CSSProperties {
  if (effect === "futebol") {
    return {
      background:
        "radial-gradient(circle at 50% 38%, rgba(254,221,0,.18), transparent 30%), radial-gradient(circle at 24% 22%, rgba(0,156,59,.2), transparent 32%), radial-gradient(circle at 78% 72%, rgba(0,39,118,.2), transparent 34%), rgba(2,6,23,.24)",
      backdropFilter: "blur(.8px)",
      WebkitBackdropFilter: "blur(.8px)",
    };
  }

  if (effect === "copa2026") {
    return {
      background:
        "radial-gradient(circle at 50% 18%, rgba(255,255,255,.24), transparent 25%), radial-gradient(circle at 22% 24%, rgba(0,156,59,.26), transparent 32%), radial-gradient(circle at 82% 76%, rgba(0,39,118,.28), transparent 34%), radial-gradient(circle at 50% 72%, rgba(254,221,0,.22), transparent 38%), rgba(2,6,23,.22)",
      backdropFilter: "blur(1px)",
      WebkitBackdropFilter: "blur(1px)",
    };
  }

  if (effect === "princesa") {
    return {
      background:
        "radial-gradient(circle at center, rgba(251,191,36,.28), transparent 42%), linear-gradient(135deg, rgba(190,24,93,.22), rgba(88,28,135,.22))",
    };
  }

  if (effect === "luxo") {
    return {
      background:
        "radial-gradient(circle at center, rgba(212,175,55,.24), transparent 42%), linear-gradient(135deg, rgba(2,6,23,.42), rgba(120,113,108,.18))",
    };
  }

  if (effect === "infantil") {
    return {
      background:
        "radial-gradient(circle at center, rgba(251,146,60,.28), transparent 42%), linear-gradient(135deg, rgba(14,165,233,.22), rgba(236,72,153,.22))",
    };
  }

  return {};
}

function getCardTheme(effect: string): CSSProperties {
  if (effect === "futebol") {
    return {
      width: "min(360px, calc(100% - 34px))",
      minHeight: 224,
      padding: "68px 18px 22px",
      overflow: "visible",
      position: "relative",
      background: "rgba(255,255,255,.14)",
      backdropFilter: "blur(18px) saturate(1.55)",
      WebkitBackdropFilter: "blur(18px) saturate(1.55)",
      border: "2px solid rgba(255,255,255,.72)",
      boxShadow:
        "0 26px 92px rgba(0,0,0,.34), 0 0 0 1px rgba(255,255,255,.56), 0 0 28px rgba(255,255,255,.18), inset 0 1px 0 rgba(255,255,255,.56)",
      animation:
        "omniConfirmPop .36s cubic-bezier(.2,.9,.2,1), omniFutebolCardShine 1.05s ease-in-out .12s 3",
    };
  }

  if (effect === "copa2026") {
    return {
      width: "min(370px, calc(100% - 30px))",
      minHeight: 252,
      padding: "78px 20px 24px",
      overflow: "visible",
      position: "relative",
      background:
        "linear-gradient(135deg, rgba(255,255,255,.22), rgba(255,255,255,.08))",
      backdropFilter: "blur(20px) saturate(1.85)",
      WebkitBackdropFilter: "blur(20px) saturate(1.85)",
      border: "2px solid rgba(255,255,255,.82)",
      boxShadow:
        "0 30px 100px rgba(0,0,0,.38), 0 0 0 1px rgba(255,255,255,.62), 0 0 34px rgba(254,221,0,.38), inset 0 1px 0 rgba(255,255,255,.68)",
      animation:
        "omniConfirmPop .36s cubic-bezier(.2,.9,.2,1), omniCopa2026Glow 1.05s ease-in-out .12s 3",
    };
  }

  if (effect === "princesa") {
    return {
      background:
        "linear-gradient(135deg, rgba(190,24,93,.94), rgba(251,191,36,.9))",
      boxShadow:
        "0 24px 90px rgba(190,24,93,.34), 0 0 0 8px rgba(251,191,36,.12)",
    };
  }

  if (effect === "luxo") {
    return {
      background:
        "linear-gradient(135deg, rgba(15,23,42,.96), rgba(180,142,58,.92))",
      boxShadow:
        "0 24px 90px rgba(2,6,23,.46), 0 0 0 8px rgba(212,175,55,.12)",
    };
  }

  if (effect === "infantil") {
    return {
      background:
        "linear-gradient(135deg, rgba(14,165,233,.94), rgba(236,72,153,.9), rgba(251,146,60,.92))",
      boxShadow:
        "0 24px 90px rgba(14,165,233,.3), 0 0 0 8px rgba(255,255,255,.1)",
    };
  }

  return {};
}

function getIconTheme(effect: string): CSSProperties {
  if (effect === "futebol" || effect === "copa2026") {
    return {
      width: effect === "copa2026" ? 88 : 82,
      height: effect === "copa2026" ? 88 : 82,
      fontSize: effect === "copa2026" ? 52 : 48,
      color: "#0f172a",
      background:
        "radial-gradient(circle at 34% 28%, #ffffff, #f8fafc 42%, #d1d5db 100%)",
      position: "absolute",
      top: effect === "copa2026" ? -48 : -44,
      right: 24,
      zIndex: 4,
      border: "5px solid rgba(255,255,255,.96)",
      outline: "5px solid rgba(0,39,118,.8)",
      boxShadow:
        "0 0 0 10px rgba(254,221,0,.24), 0 0 38px rgba(254,221,0,.92), 0 18px 42px rgba(0,0,0,.32)",
      animation:
        "omniFutebolBall .86s cubic-bezier(.2,.9,.2,1), omniFutebolBallGlow 1s ease-in-out .2s 3",
    };
  }

  if (effect === "princesa") return { color: "#be185d" };
  if (effect === "luxo") return { color: "#92400e" };
  if (effect === "infantil") return { color: "#ec4899" };

  return {};
}

function getTitleTheme(effect: string): CSSProperties {
  if (effect === "futebol" || effect === "copa2026") {
    return {
      position: "relative",
      zIndex: 3,
      fontSize: effect === "copa2026" ? "clamp(40px, 13vw, 56px)" : "clamp(38px, 13vw, 52px)",
      letterSpacing: "-.04em",
      color: "#ffffff",
      textTransform: "uppercase",
      textShadow:
        "0 3px 0 rgba(0,39,118,.72), 0 8px 20px rgba(0,0,0,.44), 0 0 22px rgba(255,255,255,.55)",
      WebkitTextStroke: "1px rgba(2,6,23,.38)",
      animation: "omniFutebolTitlePop .52s cubic-bezier(.2,.9,.2,1) both",
    };
  }

  return {};
}

function getTextTheme(effect: string): CSSProperties {
  if (effect === "futebol" || effect === "copa2026") {
    return {
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
  }

  return {};
}

function renderCardBackdrop(effect: string) {
  if (effect === "futebol") {
    return <div style={futebolGlowStyle} />;
  }

  if (effect === "copa2026") {
    return (
      <>
        <div style={copa2026GlowStyle} />
        <div style={copa2026TrophyStyle} aria-hidden="true">🏆</div>
        <div style={copa2026LabelStyle} aria-hidden="true">WORLD CUP 2026</div>
      </>
    );
  }

  return null;
}

function renderParticles(effect: string) {
  if (effect === "nenhum") return null;

  const colors =
    effect === "futebol" || effect === "copa2026"
      ? ["#009c3b", "#ffdf00", "#002776", "#ffffff"]
      : effect === "princesa"
        ? ["#f9a8d4", "#fbbf24", "#ffffff", "#c084fc"]
        : effect === "luxo"
          ? ["#d4af37", "#ffffff", "#0f172a", "#a16207"]
          : effect === "infantil"
            ? ["#38bdf8", "#fb7185", "#facc15", "#ffffff"]
            : ["#7c3aed", "#14b8a6", "#ffffff", "#f8fafc"];

  const isFootball = effect === "futebol" || effect === "copa2026";

  return (
    <div style={particlesLayerStyle} aria-hidden="true">
      {Array.from({ length: isFootball ? 56 : effect === "padrao" ? 18 : 30 }).map((_, index) => {
        const left = (index * 37) % 100;
        const delay = (index % 10) * 0.055;
        const x = ((index % 9) - 4) * (isFootball ? 34 : 28);
        const size = isFootball ? 8 + (index % 5) * 4 : 7 + (index % 4) * 3;
        const color = colors[index % colors.length];

        return (
          <span
            key={index}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: -24,
              width: size,
              height: isFootball && index % 5 === 0 ? size : Math.max(5, size - 2),
              borderRadius: isFootball && index % 5 === 0 ? 999 : 3,
              background: isFootball && index % 5 === 0 ? "#ffffff" : color,
              color,
              boxShadow:
                isFootball && index % 5 === 0
                  ? "inset 0 0 0 2px #111827"
                  : "0 6px 18px rgba(0,0,0,.16)",
              animation: `omniConfettiFall ${1.35 + (index % 5) * 0.12}s ease-in ${delay}s both`,
              ["--x" as any]: `${x}px`,
            }}
          />
        );
      })}

      {effect !== "padrao" &&
        Array.from({ length: 10 }).map((_, index) => (
          <span
            key={`sparkle-${index}`}
            style={{
              position: "absolute",
              left: `${8 + ((index * 19) % 84)}%`,
              top: `${12 + ((index * 23) % 70)}%`,
              color: colors[(index + 1) % colors.length],
              fontSize: 16 + (index % 3) * 6,
              animation: `omniSparklePulse ${0.9 + (index % 4) * 0.12}s ease-in-out ${index * 0.08}s infinite`,
            }}
          >
            {isFootball ? "★" : "✦"}
          </span>
        ))}
    </div>
  );
}

const overlayStyle: CSSProperties = {
  inset: 0,
  zIndex: 80,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
  boxSizing: "border-box",
  overflow: "hidden",
  pointerEvents: "none",
};

const cardStyle: CSSProperties = {
  width: "min(330px, calc(100% - 30px))",
  minHeight: 170,
  borderRadius: 26,
  padding: "34px 20px 26px",
  boxSizing: "border-box",
  color: "#ffffff",
  background: "linear-gradient(135deg, rgba(124,58,237,.95), rgba(14,165,233,.9))",
  boxShadow: "0 24px 90px rgba(15,23,42,.34)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  textAlign: "center",
  animation: "omniConfirmPop .34s cubic-bezier(.2,.9,.2,1)",
};

const iconStyle: CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 999,
  background: "rgba(255,255,255,.92)",
  color: "#7c3aed",
  display: "grid",
  placeItems: "center",
  fontSize: 32,
  fontWeight: 950,
  boxShadow: "0 12px 30px rgba(0,0,0,.18)",
};

const titleStyle: CSSProperties = {
  fontSize: 25,
  lineHeight: 1,
  fontWeight: 950,
  letterSpacing: "-.03em",
};

const textStyle: CSSProperties = {
  color: "rgba(255,255,255,.88)",
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.35,
};

const futebolGlowStyle: CSSProperties = {
  position: "absolute",
  inset: 8,
  borderRadius: 22,
  pointerEvents: "none",
  background:
    "radial-gradient(circle at 22% 18%, rgba(0,156,59,.56), transparent 26%), radial-gradient(circle at 78% 32%, rgba(254,221,0,.55), transparent 28%), radial-gradient(circle at 50% 92%, rgba(0,39,118,.48), transparent 34%)",
  filter: "blur(.1px)",
  opacity: 0.92,
};

const copa2026GlowStyle: CSSProperties = {
  position: "absolute",
  inset: 8,
  borderRadius: 22,
  pointerEvents: "none",
  background:
    "radial-gradient(circle at 18% 18%, rgba(0,156,59,.62), transparent 28%), radial-gradient(circle at 82% 30%, rgba(254,221,0,.62), transparent 30%), radial-gradient(circle at 50% 88%, rgba(0,39,118,.55), transparent 36%), linear-gradient(135deg, rgba(255,255,255,.16), rgba(255,255,255,.04))",
  opacity: 0.94,
};

const copa2026TrophyStyle: CSSProperties = {
  position: "relative",
  zIndex: 3,
  fontSize: 42,
  marginBottom: -4,
  filter: "drop-shadow(0 10px 22px rgba(0,0,0,.34)) drop-shadow(0 0 18px rgba(254,221,0,.48))",
  animation: "omniCopaTrophyFloat 1.6s ease-in-out infinite",
};

const copa2026LabelStyle: CSSProperties = {
  position: "relative",
  zIndex: 3,
  marginBottom: 2,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.48)",
  background: "rgba(255,255,255,.12)",
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: ".1em",
  textShadow: "0 2px 10px rgba(0,0,0,.32)",
};

const particlesLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  pointerEvents: "none",
  zIndex: 2,
};

const starsStyle: CSSProperties = {
  position: "relative",
  zIndex: 3,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  marginTop: 4,
  color: "#ffdf00",
  fontSize: 18,
  textShadow: "0 2px 12px rgba(0,0,0,.38), 0 0 16px rgba(254,221,0,.56)",
};

const keyframesCss = `
@keyframes omniConfirmPop {
  0% { opacity: 0; transform: scale(.72) translateY(12px); }
  72% { opacity: 1; transform: scale(1.04) translateY(0); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes omniFutebolCardShine {
  0%, 100% { box-shadow: 0 26px 92px rgba(0,0,0,.34), 0 0 0 1px rgba(255,255,255,.56), 0 0 28px rgba(255,255,255,.18), inset 0 1px 0 rgba(255,255,255,.56); }
  50% { box-shadow: 0 26px 92px rgba(0,0,0,.34), 0 0 0 2px rgba(255,255,255,.72), 0 0 48px rgba(254,221,0,.76), inset 0 1px 0 rgba(255,255,255,.66); }
}
@keyframes omniCopa2026Glow {
  0%, 100% { box-shadow: 0 30px 100px rgba(0,0,0,.38), 0 0 0 1px rgba(255,255,255,.62), 0 0 34px rgba(254,221,0,.38), inset 0 1px 0 rgba(255,255,255,.68); }
  50% { box-shadow: 0 30px 100px rgba(0,0,0,.38), 0 0 0 2px rgba(255,255,255,.86), 0 0 58px rgba(254,221,0,.85), 0 0 28px rgba(0,156,59,.42), inset 0 1px 0 rgba(255,255,255,.78); }
}
@keyframes omniFutebolBall {
  0% { opacity: 0; transform: scale(.52) rotate(-220deg); }
  72% { opacity: 1; transform: scale(1.12) rotate(24deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
@keyframes omniFutebolBallGlow {
  0%, 100% { filter: drop-shadow(0 0 0 rgba(254,221,0,0)); }
  50% { filter: drop-shadow(0 0 18px rgba(254,221,0,.9)); }
}
@keyframes omniFutebolTitlePop {
  0% { opacity: 0; transform: scale(.56) rotate(-2deg); }
  70% { opacity: 1; transform: scale(1.12) rotate(1deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
@keyframes omniConfettiFall {
  0% { opacity: 0; transform: translate3d(0,-20px,0) rotate(0deg); }
  12% { opacity: 1; }
  100% { opacity: 0; transform: translate3d(var(--x), 680px, 0) rotate(720deg); }
}
@keyframes omniSparklePulse {
  0%, 100% { opacity: .3; transform: scale(.78) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.18) rotate(12deg); }
}
@keyframes omniCopaTrophyFloat {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-4px) scale(1.04); }
}
`;
